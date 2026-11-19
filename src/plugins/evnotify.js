var DEFAULT_RESTURL = 'https://app.evnotify.de/';

var normalizeBaseUrl = function (baseUrl) {
    if (!baseUrl || typeof baseUrl !== 'string') return DEFAULT_RESTURL;
    return (baseUrl.slice(-1) === '/') ? baseUrl : (baseUrl + '/');
};

var getBaseUrlFromVersion = function (version) {
    var normalized = (typeof version === 'string') ? version.trim().toUpperCase() : 'V2';
    if (normalized === 'V3') return 'https://api.evnotify.de/';
    return DEFAULT_RESTURL;
};

var unsupportedV3 = 'This feature is unavailable with V3.';
var v3SettingFields = ['logSummary', 'socThreshold', 'language', 'car', 'capacity', 'consumption', 'consumptionUnit', 'rangeUnit', 'device', 'email', 'telegram'];

var toV3Settings = function (settings) {
    var result = {};
    Object.keys(settings || {}).forEach(function (key) {
        var mapped = key === 'soc' ? 'socThreshold' : key;
        if (mapped === 'email' && settings[key] != null && String(settings[key]).trim() === '') result.email = null;
        else if (v3SettingFields.indexOf(mapped) !== -1 && settings[key] !== '' && settings[key] !== undefined) result[mapped] = settings[key];
    });
    return result;
};

var fromV3Settings = function (settings) {
    var result = Object.assign({}, settings || {});
    if (result.socThreshold != null) result.soc = result.socThreshold;
    return result;
};

var toSnakeCaseKey = function (key) {
    if (!key || typeof key !== 'string') return key;
    return key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
};

var normalizeKeysToSnake = function (obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
    var normalized = {};
    Object.keys(obj).forEach(function (key) {
        normalized[toSnakeCaseKey(key)] = obj[key];
    });
    return normalized;
};

var toUnixSeconds = function (value) {
    if (value == null) return 0;
    if (typeof value === 'number') return isFinite(value) && value > 0 ? Math.floor(value > 100000000000 ? value / 1000 : value) : 0;
    if (typeof value === 'string') {
        if (/^\d+$/.test(value)) return toUnixSeconds(Number(value));
        var parsed = Date.parse(value);
        if (!isNaN(parsed) && parsed > 0) return Math.floor(parsed / 1000);
    }
    return 0;
};

var fromV3Sync = function (sync) {
    if (!sync || !Object.keys(sync).length) return null;
    var result = normalizeKeysToSnake(sync);
    if (sync.socBMS != null) result.soc_bms = sync.socBMS;
    if (sync.cec != null) result.cumulative_energy_charged = sync.cec;
    if (sync.ced != null) result.cumulative_energy_discharged = sync.ced;
    // V3 sends km/h; shared views convert legacy gps_speed from m/s to km/h.
    if (sync.speed != null) result.gps_speed = sync.speed / 3.6;
    // Freshness follows the observation time, including delayed uploads.
    var timestamp = toUnixSeconds(sync.timestamp) || toUnixSeconds(sync.updatedAt);
    result.last_soc = timestamp;
    result.last_extended = timestamp;
    if (sync.latitude != null && sync.longitude != null) result.last_location = timestamp;
    result.timestamp = timestamp;
    return result;
};

var fromV3History = function (history) {
    return (Array.isArray(history) ? history : []).map(fromV3Sync).filter(Boolean)
        .sort(function (a, b) { return b.timestamp - a.timestamp; });
};

var fromV3Log = function (log) {
    if (!log) return null;
    var result = normalizeKeysToSnake(log);
    result.charge = log.type === 'charge';
    result.start = toUnixSeconds(log.startDate);
    result.end = toUnixSeconds(log.endDate) || null;
    result.updated_at = toUnixSeconds(log.updatedAt);
    result.start_soc = log.startSOC;
    result.end_soc = log.endSOC;
    result.start_odo = log.startODO;
    result.end_odo = log.endODO;
    result.start_cec = log.startCEC;
    result.end_cec = log.endCEC;
    result.start_ced = log.startCED;
    result.end_ced = log.endCED;
    result.average_kw = log.averageKW;
    if (log.averageSpeed != null) result.average_speed = log.averageSpeed;
    result.stats = fromV3History(log.history);
    return result;
};

var resolveRoute = function (self, type, fnc, data) {
    if (self.version !== 'V3') return { method: type, path: fnc, data: data };
    var akey = encodeURIComponent(self.akey || (data && data.akey) || '');
    var account = 'account/' + akey;
    var logs = 'logs/' + akey;
    var settings = 'settings/' + akey;
    switch (fnc) {
        case 'key': return { method: 'get', path: 'account/akey' };
        case 'register': return { method: 'post', path: 'account', data: { akey: data.akey, password: data.password } };
        case 'login': return { method: 'post', path: 'account/' + encodeURIComponent(data.akey) + '/login', data: { password: data.password } };
        case 'changepw': return { method: 'patch', path: account + '/password', data: { password: data.oldpassword, newPassword: data.newpassword } };
        case 'renewtoken': return { method: 'patch', path: account + '/token', data: { password: data.password } };
        case 'settings': return type.toLowerCase() === 'get' ? { method: 'get', path: settings } : { method: 'patch', path: settings, data: toV3Settings(data.settings) };
        case 'soc': return type.toLowerCase() === 'get' ? { method: 'get', path: logs + '/last-sync' } : { method: 'post', path: logs, data: { socDisplay: data.display, socBMS: data.bms, timestamp: new Date().toISOString() } };
        case 'extended':
        case 'location': return { method: 'get', path: logs + '/last-sync' };
        case 'logs': return { method: 'get', path: logs, data: data.charge === null ? null : { type: data.charge ? 'charge' : 'drive' } };
        case 'logdetail': return type.toLowerCase() === 'get' ? { method: 'get', path: logs + '/' + encodeURIComponent(data.id) } : { method: 'patch', path: logs + '/' + encodeURIComponent(data.log.id), data: { title: data.log.title, type: data.log.type != null ? data.log.type : (data.log.charge ? 'charge' : 'drive') } };
        default: return null;
    }
};

/**
 * Function which sends a specific request to backend server and returns the information/data (or error information if any)
 * @param {String}      [type]      the HTTP method to use (POST|GET|PUT|DELETE)
 * @param  {String}     [fnc]       the function which should be used (e.g. login)
 * @param  {*}          [data]      the data to send (mostly an object)
 * @param  {Function}   callback    callback function
 * @return {void}
 */
var sendRequest = function (type, fnc, data, callback, baseUrl, authHeader) {
    var completed = false;
    var done = function (err, res) {
        if (completed) return;
        completed = true;
        if (typeof callback === 'function') callback(err, res);
    };
    try {
        var xmlHttp = new XMLHttpRequest(),
            retData;

        type = type.toUpperCase();
        data = ((typeof data === 'object' && data != null) ? data : '');

        // apply listener for the request
        xmlHttp.onreadystatechange = function () {
            if (this.readyState === 4) {
                // try to parse the response as JSON
                try {
                    retData = JSON.parse(this.responseText);
                } catch (e) {
                    retData = this.responseText
                }

                var error = null;
                if (this.status < 200 || this.status >= 300) {
                    error = (retData && retData.error && retData.error.code) ? retData.error.code : (this.status || 'Network request failed');
                    if (baseUrl === 'https://api.evnotify.de/' && retData && retData.message) {
                        error = Array.isArray(retData.message) ? retData.message.join(', ') : retData.message;
                    }
                }
                done(error, {
                    status: this.status,
                    data: retData
                });
            }
        };
        xmlHttp.onerror = function (e) {
            done(e || 'Network request failed', null);
        };
        xmlHttp.ontimeout = function () { done('Request timed out', null); };
        xmlHttp.onabort = function () { done('Request cancelled', null); };
        // send the request
        var urlBase = normalizeBaseUrl(baseUrl || DEFAULT_RESTURL);
        xmlHttp.open(type, urlBase + ((fnc) ? fnc : '') + ((type === 'GET' && data && Object.keys(data).length) ?
            "?" + Object
            .keys(data)
            .map(function (key) {
                return key + "=" + encodeURIComponent(data[key])
            })
            .join("&") : ''
        ), true);
        xmlHttp.timeout = 30000;
        xmlHttp.setRequestHeader('Content-Type', 'application/json');
        if (authHeader) xmlHttp.setRequestHeader('Authorization', authHeader);
        xmlHttp.send((type !== 'GET' && data) ? JSON.stringify(data) : null);
    } catch (e) {
        if (completed) throw e;
        done(e, null);
    }
};

/**
 * Function to retrieve a random akey which was available at the time of the request
 * @param  {Function} [callback]    callback function
 * @return {Object}                   returns this
 */
EVNotify.prototype.getKey = function (callback) {
    var self = this;

    self._request('get', 'key', null, function (err, res) {
        // send response to callback if applied
        if (typeof callback === 'function') callback(err, ((err) ? null : ((res && res.data) ? res.data.akey : null)));
    });

    return self;
};

/**
 * Function to register account for given akey with specified password to retrieve and set token and the AKey
 * @param  {String}   akey          the AKey to register
 * @param  {String}   password      the password to use for the AKey
 * @param  {Function} [callback]    callback function
 * @return {Object}                 returns this
 */
EVNotify.prototype.register = function (akey, password, callback) {
    var self = this;

    self._request('post', 'register', {
        akey: akey,
        password: password
    }, function (err, res) {
        // attach token
        self.token = ((!err && res && res.data) ? res.data.token : null);
        // attach AKey
        self.akey = ((self.token) ? akey : null);
        // send response to callback if applied
        if (typeof callback === 'function') callback(err, ((err) ? null : self.token));
    });

    return self;
};

/**
 * Function to login account with given credentials and applies the AKey the returned token
 * @param  {String}   akey          the AKey to login
 * @param  {String}   password      the password to use for the account
 * @param  {Function} [callback]    callback function
 * @return {Object}                 returns this
 */
EVNotify.prototype.login = function (akey, password, callback) {
    var self = this;

    self._request('post', 'login', {
        akey: akey,
        password: password
    }, function (err, res) {
        // attach token
        self.token = ((!err && res && res.data) ? res.data.token : null);
        // attach AKey
        self.akey = ((self.token) ? akey : null);
        // send response to callback if applied
        if (typeof callback === 'function') callback(err, ((err) ? null : self.token));
    });

    return self;
};

/**
 * Function to change the password of the account for specified AKey with given old password and the new password
 * NOTE: Requires previous authentication via login request
 * @param  {String}   oldpassword   the old (current) password
 * @param  {String}   newpassword   the new password to set
 * @param  {Function} [callback]    callback function
 * @return {Object}                 returns this
 */
EVNotify.prototype.changePW = function (oldpassword, newpassword, callback) {
    var self = this;

    // check authentication
    if (!self.akey || !self.token) {
        if (typeof callback === 'function') callback(401, null); // missing previous login request
    } else {
        self._request('post', 'changepw', {
            akey: self.akey,
            token: self.token,
            oldpassword: oldpassword,
            newpassword: newpassword
        }, function (err, res) {
            if (typeof callback === 'function') callback(err, (!!(!err && res)));
        });
    }

    return self;
};

/**
 * Function to renew and change the current token to a new persistent one
 * NOTE: Requires previous authentication via login request
 * @param  {String}   password      the password of the AKey to change the token for
 * @param  {Function} [callback]    callback function
 * @return {Object}                 returns this
 */
EVNotify.prototype.renewToken = function (password, callback) {
    var self = this;

    // check authentication
    if (!self.akey || !self.token) {
        if (typeof callback === 'function') callback(401, null); // missing previous login request
    } else {
        self._request('put', 'renewtoken', {
            akey: self.akey,
            token: self.token,
            password: password
        }, function (err, res) {
            // attach new token
            self.token = ((!err && res && res.data && res.data.token) ? res.data.token : self.token);
            if (typeof callback === 'function') callback(err, ((err) ? null : self.token));
        });
    }

    return self;
};

/**
 * Function to get the settings and stats of the account for the given AKey
 * @param  {Function} [callback]    callback function
 * @return {Object}                 returns this
 */
EVNotify.prototype.getSettings = function (callback) {
    var self = this;

    // check authentication
    if (!self.akey || !self.token) {
        if (typeof callback === 'function') callback(401, null); // missing previous login request
    } else {
        self._request('get', 'settings', {
            akey: self.akey,
            token: self.token
        }, function (err, res) {
            var settings = !err && res && res.data ? (self.version === 'V3' ? fromV3Settings(res.data) : res.data.settings) : null;
            if (typeof callback === 'function') callback(err, settings);
        });
    }

    return self;
};

/**
 * Function to set the settings and stats of the account for the given AKey
 * @param  {Object}   settingsObj   the object containing all keys to set
 * @param  {Function} [callback]    callback function
 * @return {Object}                 returns this
 */
EVNotify.prototype.setSettings = function (settingsObj, callback) {
    var self = this;

    // check authentication
    if (!self.akey || !self.token) {
        if (typeof callback === 'function') callback(401, null); // missing previous login request
    } else {
        self._request('put', 'settings', {
            akey: self.akey,
            token: self.token,
            settings: settingsObj
        }, function (err, res) {
            if (typeof callback === 'function') callback(err, (!!(!err && res)));
        });
    }

    return self;
};

/**
 * Function to submit the current state of charge for the AKey
 * @param  {Number} display       the state of charge (display) to set
 * @param {Number} bms the state of charge (bms) to set
 * @param  {Function} callback  callback function
 * @return {Object}             returns this
 */
EVNotify.prototype.setSOC = function (display, bms, callback) {
    var self = this;

    // check authentication
    if (!self.akey || !self.token) {
        if (typeof callback === 'function') callback(401, null); // missing previous login request
    } else {
        self._request('post', 'soc', {
            akey: self.akey,
            token: self.token,
            display: display,
            bms: bms
        }, function (err, res) {
            if (typeof callback === 'function') callback(err, (!!(!err && res)));
        });
    }

    return self;
};

/**
 * Function to get the current state of charge for the AKey
 * @param  {Function} callback  callback function
 * @return {Object}             returns this
 */
EVNotify.prototype.getSOC = function (callback) {
    var self = this;

    // check authentication
    if (!self.akey || !self.token) {
        if (typeof callback === 'function') callback(401, null); // missing previous login request
    } else {
        self._request('get', 'soc', {
            akey: self.akey,
            token: self.token
        }, function (err, socObj) {
            var data = (!err && socObj && socObj.data) ? socObj.data : null;
            if (self.version === 'V3') data = fromV3Sync(data);
            if (typeof callback === 'function') callback(err, data);
        });
    }

    return self;
};

/**
 * Function to get the extended data for the AKey
 * @param  {Function} callback  callback function
 * @return {Object}             returns this
 */
EVNotify.prototype.getExtended = function (callback) {
    var self = this;

    // check authentication
    if (!self.akey || !self.token) {
        if (typeof callback === 'function') callback(401, null); // missing previous login request
    } else {
        self._request('get', 'extended', {
            akey: self.akey,
            token: self.token
        }, function (err, extendedObj) {
            var data = (!err && extendedObj && extendedObj.data) ? extendedObj.data : null;
            if (self.version === 'V3') data = fromV3Sync(data);
            if (typeof callback === 'function') callback(err, data);
        });
    }

    return self;
};

/**
 * Function to get the latest location data for the AKey
 * @param  {Function} callback  callback function
 * @return {Object}             returns this
 */
EVNotify.prototype.getLocation = function (callback) {
    var self = this;

    // check authentication
    if (!self.akey || !self.token) {
        if (typeof callback === 'function') callback(401, null); // missing previous login request
    } else {
        self._request('get', 'location', {
            akey: self.akey,
            token: self.token
        }, function (err, locationObj) {
            var data = !err && locationObj && locationObj.data ? locationObj.data : null;
            if (self.version === 'V3') data = fromV3Sync(data);
            if (typeof callback === 'function') callback(err, data);
        });
    }

    return self;
};

// V3 accepts null to list every log type, including unknown.
EVNotify.prototype.getLogs = function (charge, callback) {
    var self = this;

    // check authentication
    if (!self.akey || !self.token) {
        if (typeof callback === 'function') callback(401, null); // missing previous login request
    } else {
        self._request('get', 'logs', {
            akey: self.akey,
            token: self.token,
            charge: charge
        }, function (err, logsObj) {
            var data = !err && logsObj && logsObj.data ? logsObj.data : null;
            if (self.version === 'V3' && Array.isArray(data)) data = data.map(fromV3Log);
            if (typeof callback === 'function') callback(err, data);
        });
    }

    return self;
};

EVNotify.prototype.getLog = function (id, callback) {
    var self = this;

    // check authentication
    if (!self.akey || !self.token) {
        if (typeof callback === 'function') callback(401, null); // missing previous login request
    } else if (self.version === 'V3') {
        var detailPath = 'logs/' + encodeURIComponent(self.akey) + '/' + encodeURIComponent(id);
        self.requestV3('get', detailPath, null, function (err, detail) {
            if (err) { if (typeof callback === 'function') callback(err, null); return; }
            self.requestV3('get', detailPath + '/history', null, function (historyErr, history) {
                var log = fromV3Log(Object.assign({}, detail.data, { history: historyErr ? [] : history.data }));
                if (historyErr) log.historyError = 'Log history is unavailable (' + historyErr + ').';
                if (typeof callback === 'function') callback(null, log);
            });
        });
    } else {
        self._request('get', 'logdetail', {
            akey: self.akey,
            token: self.token,
            id: id
        }, function (err, logObj) {
            if (typeof callback === 'function') callback(err, ((!err && logObj && logObj.data) ? logObj.data : null));
        });
    }

    return self;
};

EVNotify.prototype.getLogHistory = function (id, callback) {
    return this.requestV3('get', 'logs/' + encodeURIComponent(this.akey) + '/' + encodeURIComponent(id) + '/history', null, function (err, res) {
        if (!err && (!res || !Array.isArray(res.data))) err = 'Invalid history response';
        if (typeof callback === 'function') callback(err, err ? null : fromV3History(res.data));
    });
};

EVNotify.prototype.getLatestLog = function (callback) {
    var self = this;

    // check authentication
    if (!self.akey || !self.token) {
        if (typeof callback === 'function') callback(401, null); // missing previous login request
    } else if (self.version === 'V3') {
        self.requestV3('get', 'logs/' + encodeURIComponent(self.akey), null, function (err, res) {
            var logs = !err && res && Array.isArray(res.data) ? res.data : [];
            logs.sort(function (a, b) { return toUnixSeconds(b.startDate) - toUnixSeconds(a.startDate); });
            if (typeof callback === 'function') callback(err, logs.length ? fromV3Log(logs[0]) : null);
        });
    } else {
        self._request('get', 'logdetail/latest', {
            akey: self.akey,
            token: self.token
        }, function (err, logObj) {
            if (typeof callback === 'function') callback(err, ((!err && logObj && logObj.data) ? logObj.data : null));
        });
    }

    return self;
};

EVNotify.prototype.updateLog = function (log, callback) {
    var self = this;

    // check authentication
    if (!self.akey || !self.token) {
        if (typeof callback === 'function') callback(401, null); // missing previous login request
    } else {
        self._request('put', 'logdetail', {
            akey: self.akey,
            token: self.token,
            log: log
        }, function (err) {
            if (typeof callback === 'function') callback(err, !!err);
        });
    }

    return self;
};

/**
 * Function to send out all available / enabled notifications for the AKey
 * @param  {Function} callback  callback function
 * @return {Object}             returns this
 */
EVNotify.prototype.sendNotification = function (abort, callback) {
    var self = this;

    // check authentication
    if (!self.akey || !self.token) {
        if (typeof callback === 'function') callback(401, null); // missing previous login request
    } else {
        self._request('post', 'notification', {
            akey: self.akey,
            token: self.token,
            abort: abort
        }, function (err, res) {
            if (typeof callback === 'function') callback(err, (!!(!err && res)));
        });
    }

    return self;
};

/**
 * Function to list all robots for associated AKey
 * @param  {Function} callback  callback function
 * @return {Object}             returns this
 */
EVNotify.prototype.getRobots = function (callback) {
    var self = this;

    // check authentication
    if (!self.akey || !self.token) {
        if (typeof callback === 'function') callback(401, null); // missing previous login request
    } else {
        self._request('get', 'robots', {
            akey: self.akey,
            token: self.token
        }, function (err, res) {
            if (typeof callback === 'function') callback(err, res && res.data ? res.data : null);
        });
    }

    return self;
};

/**
 * Function to buy a robot for AKey
 * @param  {Function} callback  callback function
 * @return {Object}             returns this
 */
EVNotify.prototype.buyRobot = function (robotID, orderID, callback) {
    var self = this;

    // check authentication
    if (!self.akey || !self.token) {
        if (typeof callback === 'function') callback(401, null); // missing previous login request
    } else {
        self._request('post', 'robot', {
            akey: self.akey,
            token: self.token,
            robotID: robotID,
            orderID: orderID
        }, function (err, res) {
            if (typeof callback === 'function') callback(err, (!!(!err && res)));
        });
    }

    return self;
};

/**
 * Function to list all cats for associated AKey and provided tag
 * @param  {Function} callback  callback function
 * @return {Object}             returns this
 */
EVNotify.prototype.getCats = function (tag, callback) {
    var self = this;

    // check authentication
    if (!self.akey || !self.token) {
        if (typeof callback === 'function') callback(401, null); // missing previous login request
    } else {
        self._request('get', 'cats', {
            akey: self.akey,
            token: self.token,
            tag: tag
        }, function (err, res) {
            if (typeof callback === 'function') callback(err, res && res.data ? res.data : null);
        });
    }

    return self;
};

/**
 * Function to buy a cat for AKey
 * @param  {Function} callback  callback function
 * @return {Object}             returns this
 */
EVNotify.prototype.buyCat = function (catID, orderID, callback) {
    var self = this;

    // check authentication
    if (!self.akey || !self.token) {
        if (typeof callback === 'function') callback(401, null); // missing previous login request
    } else {
        self._request('post', 'cat', {
            akey: self.akey,
            token: self.token,
            catID: catID,
            orderID: orderID
        }, function (err, res) {
            if (typeof callback === 'function') callback(err, (!!(!err && res)));
        });
    }

    return self;
};

/**
 * Function to unlink the ABRP integration for AKey
 * @param  {Function} callback  callback function
 * @return {Object}             returns this
 */
 EVNotify.prototype.unlinkABRP = function (callback) {
    var self = this;

    // check authentication
    if (!self.akey || !self.token) {
        if (typeof callback === 'function') callback(401, null); // missing previous login request
    } else {
        self._request('post', 'integrations/abrp/unlink/' + self.akey, {
            token: self.token
        }, function (err, res) {
            if (typeof callback === 'function') callback(err, (!!(!err && res)));
        });
    }
 };

EVNotify.prototype.setVersion = function (version) {
    this._sessionGeneration = (this._sessionGeneration || 0) + 1;
    this.version = (typeof version === 'string') ? version.trim().toUpperCase() : 'V2';
    this.baseUrl = normalizeBaseUrl(getBaseUrlFromVersion(this.version));
    this._lastSyncPending = null;
    return this;
};

var matchesSession = function (self, session) {
    return self._sessionGeneration === session.generation && self.version === session.version &&
        self.baseUrl === session.baseUrl && self.akey === session.akey && self.token === session.token;
};

EVNotify.prototype._request = function (type, fnc, data, callback) {
    var resolved = resolveRoute(this, type, fnc, data);
    if (!resolved) {
        if (typeof callback === 'function') callback(unsupportedV3, null);
        return;
    }
    var authHeader = '';
    if (this.version === 'V3' && this.akey && this.token && ['key', 'register', 'login'].indexOf(fnc) === -1) {
        authHeader = this.akey + ' ' + this.token;
    }
    if (this.version === 'V3' && resolved.path.slice(-10) === '/last-sync') {
        if (this._lastSyncPending && matchesSession(this, this._lastSyncPending)) {
            this._lastSyncPending.callbacks.push(callback);
            return;
        }
        var batch = {
            generation: this._sessionGeneration,
            version: this.version,
            baseUrl: this.baseUrl,
            akey: this.akey,
            token: this.token,
            callbacks: [callback]
        };
        this._lastSyncPending = batch;
        var self = this;
        sendRequest(resolved.method, resolved.path, resolved.data, function (err, res) {
            // A late response owns only its original batch, never a newer session's readers.
            if (self._lastSyncPending === batch) self._lastSyncPending = null;
            if (!matchesSession(self, batch)) { err = 'Session changed'; res = null; }
            batch.callbacks.forEach(function (done) { if (typeof done === 'function') done(err, res); });
        }, this.baseUrl, authHeader);
        return;
    }
    sendRequest(resolved.method, resolved.path, resolved.data, callback, this.baseUrl, authHeader);
};

EVNotify.prototype.requestV3 = function (method, path, data, callback) {
    if (this.version !== 'V3') {
        if (typeof callback === 'function') callback(unsupportedV3, null);
        return this;
    }
    if (!this.akey || !this.token) {
        if (typeof callback === 'function') callback(401, null);
        return this;
    }
    sendRequest(method, path, data, callback, this.baseUrl, this.akey + ' ' + this.token);
    return this;
};

EVNotify.prototype.deleteLog = function (id, callback) {
    return this.requestV3('delete', 'logs/' + encodeURIComponent(this.akey) + '/' + encodeURIComponent(id), null, callback);
};

EVNotify.prototype.getPremium = function (callback) {
    return this.requestV3('get', 'premium/' + encodeURIComponent(this.akey), null, callback);
};

EVNotify.prototype.redeemVoucher = function (code, callback) {
    return this.requestV3('post', 'premium/' + encodeURIComponent(this.akey) + '/redeem/voucher/' + encodeURIComponent(code), null, callback);
};

EVNotify.prototype.getTrips = function (callback) {
    return this.requestV3('get', 'trips/' + encodeURIComponent(this.akey) + '/list', null, callback);
};
EVNotify.prototype.createTrip = function (trip, callback) {
    return this.requestV3('post', 'trips/' + encodeURIComponent(this.akey), trip, callback);
};
EVNotify.prototype.deleteTrip = function (code, callback) {
    return this.requestV3('delete', 'trips/' + encodeURIComponent(this.akey) + '/' + encodeURIComponent(code), null, callback);
};
EVNotify.prototype.getStations = function (point, minKW, callback) {
    return this.requestV3('get', 'stations/' + encodeURIComponent(this.akey), { latitude: point.lat, longitude: point.lng, minKW: minKW }, callback);
};
EVNotify.prototype.getNearestStation = function (point, minKW, callback) {
    return this.requestV3('get', 'stations/' + encodeURIComponent(this.akey) + '/nearest', { latitude: point.lat, longitude: point.lng, minKW: minKW }, callback);
};
EVNotify.prototype.getRoute = function (start, end, callback) {
    return this.requestV3('get', 'stations/' + encodeURIComponent(this.akey) + '/calculate-route', { startLatitude: start.lat, startLongitude: start.lng, endLatitude: end.lat, endLongitude: end.lng }, callback);
};
EVNotify.prototype.getRouteStations = function (start, end, minKW, callback) {
    return this.requestV3('get', 'stations/' + encodeURIComponent(this.akey) + '/plan-route', { startLatitude: start.lat, startLongitude: start.lng, endLatitude: end.lat, endLongitude: end.lng, minKW: minKW }, callback);
};

export default function EVNotify(akey, token, version) {
    // prevent wrong declaration
    if (!(this instanceof EVNotify) || this.__previouslyConstructedByEVNotify) throw new Error('EVNotify must be called as constructor. Missing new keyword?');
    this.__previouslyConstructedByEVNotify = true;
    this.akey = akey;
    this.token = token;
    this.setVersion(version || 'V2');
}
