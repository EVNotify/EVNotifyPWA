// Shared by V2 and V3 views. Missing timestamps must never become January 1970.
const timestamp = value => {
    if (value == null || value === '') return null;
    const numeric = Number(value);
    const result = Number.isFinite(numeric) ? (numeric > 1e11 ? numeric / 1000 : numeric) : Date.parse(value) / 1000;
    return Number.isFinite(result) && result > 0 ? Math.floor(result) : null;
};

export default {
    timestamp,
    running(log) { return log.status === 'running' || (!log.status && !timestamp(log.end)); },
    date(log) { return timestamp(log.end) || timestamp(log.start); },
    effectiveEnd(log) {
        const end = timestamp(log.end);
        if (end) return end;
        return (log.stats || []).reduce((latest, stat) => Math.max(latest, timestamp(stat.timestamp) || 0),
            Math.max(timestamp(log.start) || 0, timestamp(log.updated_at) || 0)) || null;
    },
    dates(log, moment) {
        const start = timestamp(log.start);
        const end = timestamp(log.end);
        if (!start) return 'Date unavailable';
        const date = moment((end || start) * 1000).format('MMMM Do YYYY');
        const finish = this.running(log) ? 'Ongoing' : end ? moment(end * 1000).format('HH:mm') : 'End unavailable';
        return `${date} ${moment(start * 1000).format('HH:mm')}–${finish}`;
    },
    duration(log) {
        const start = timestamp(log.start);
        const end = this.effectiveEnd(log);
        if (!start || !end || end < start) return '–';
        const seconds = end - start;
        return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
            .map(value => String(value).padStart(2, '0')).join(':');
    },
    stats(log) {
        return (log.stats || []).filter(stat => timestamp(stat.timestamp))
            .slice().sort((a, b) => timestamp(a.timestamp) - timestamp(b.timestamp));
    },
    value(log, field, type) {
        const stats = this.stats(log);
        if (type === 'end') stats.reverse();
        const stat = stats.find(entry => entry[field] != null && Number.isFinite(entry[field]));
        return stat ? stat[field] : null;
    },
    soc(log, type) {
        const stats = this.stats(log);
        if (type === 'end') stats.reverse();
        for (const stat of stats) {
            if (Number.isFinite(stat.soc_display)) return stat.soc_display;
            if (Number.isFinite(stat.soc_bms)) return stat.soc_bms;
        }
        return null;
    }
};
