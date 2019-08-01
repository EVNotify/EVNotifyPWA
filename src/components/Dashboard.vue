<template>
  <v-layout class="full-height" justify-center>
    <v-dialog v-model="showSOCExplaination" max-width="290" persistent scrollable>
      <v-card>
        <v-card-title class="headline">State of charge</v-card-title>
        <v-card-text>
          Display: {{ syncData.soc_display }} % (displayed value in car) <br/>
          BMS: {{ syncData.soc_bms }} % (calculated value by system)
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="green darken-1" flat @click="showSOCExplaination = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-flex xs12 sm12 md6>
      <v-card class="main-card">
        <v-card-title primary-title>
          <v-layout class="upper-part">
            <v-flex xs5>
              <div class="progress-cycle-container left">
                <v-progress-circular :rotate="-90" :size="100" :width="15"
                  :value="syncData.soc_display || syncData.soc_bms" :color="cycleColor">
                  <div class="progress-cycle-text-container">
                    <p>{{ syncData.soc_display || syncData.soc_bms }} %</p>
                    <v-icon color="primary" v-if="syncData.charging">flash_on</v-icon>
                  </div>
                </v-progress-circular>
                <v-btn class="socexplainationmodal" icon ripple @click="showSOCExplaination = true">
                  <v-icon color="grey lighten-1">info</v-icon>
                </v-btn>
              </div>
            </v-flex>
            <v-flex xs7>
              <div class="progress-cycle-container">
                <v-list>
                  <v-list-tile>
                    <v-list-tile-action>
                      <v-icon color="teal">flash_on</v-icon>
                    </v-list-tile-action>
                    <v-list-tile-content>
                      <v-list-tile-title :style="{color: powerAmountColor}">{{ powerAmount }} kW</v-list-tile-title>
                      <span v-if="syncData.charging" class="font-weight-light font-italic">{{ rangePerMinute }} km / min</span>
                    </v-list-tile-content>
                  </v-list-tile>
                  <v-list-tile v-if="isSupportedCar()">
                    <v-list-tile-action>
                      <v-icon color="teal">drive_eta</v-icon>
                    </v-list-tile-action>
                    <v-list-tile-content>
                      <v-list-tile-title :style="{color: currentRangeColor}">{{ currentRange }} / {{ totalRange }} km</v-list-tile-title>
                      <span class="font-weight-light font-italic caption">{{ settings.consumption || 0 }} kWh / 100 km</span>
                    </v-list-tile-content>
                  </v-list-tile>
                  <v-list-tile v-if="syncData.charging && isSupportedCar()">
                    <v-list-tile-action>
                      <v-icon color="teal">schedule</v-icon>
                    </v-list-tile-action>
                    <v-list-tile-content>
                      <v-list-tile-title>{{ chargingTimeLeft }} h ({{ finishTime }})</v-list-tile-title>
                    </v-list-tile-content>
                  </v-list-tile>
                </v-list>
              </div>
            </v-flex>
          </v-layout>
          <small class="updated-timestamp" v-if="!dataOutdated()">{{ updatedTimestamp }}</small>
          <v-alert class="mt-2" type="warning" :value="dataOutdated()" transition="scale-transition">
            {{ dataOutdatedMessage }}<br>
            <small>{{ dataOutdatedMessageTimestamp }}</small>
          </v-alert>
          <div class="bottom-part">
            <v-list two-line>
              <v-subheader>Battery temperature</v-subheader>
              <v-list-tile>
                <v-list-tile-action>
                  <v-icon color="teal">ac_unit</v-icon>
                </v-list-tile-action>
                <v-list-tile-content>
                  <v-list-tile-title>
                    <p class="temperature-text" :style="{color: getTemperatureColor(syncData.battery_min_temperature)}">
                      {{ syncData.battery_min_temperature || 0 }}
                    </p> /
                    <p class="temperature-text" :style="{color: getTemperatureColor(syncData.battery_max_temperature)}">
                      {{ syncData.battery_max_temperature || 0 }}
                    </p> /
                    <p class="temperature-text"
                      :style="{color: getTemperatureColor(syncData.battery_inlet_temperature)}">
                      {{ syncData.battery_inlet_temperature || 0 }}
                    </p> °C
                  </v-list-tile-title>
                  <v-list-tile-sub-title>Min / Max / Inlet</v-list-tile-sub-title>
                </v-list-tile-content>
              </v-list-tile>
              <v-subheader class="mt-2">Battery data</v-subheader>
              <v-layout row wrap>
                <v-flex xs6>
                  <v-list-tile>
                    <v-list-tile-action>
                      <v-icon color="teal">battery_charging_full</v-icon>
                    </v-list-tile-action>
                    <v-list-tile-content>
                      <v-list-tile-title>{{ syncData.dc_battery_voltage || 0 }} V</v-list-tile-title>
                      <v-list-tile-sub-title>Voltage</v-list-tile-sub-title>
                    </v-list-tile-content>
                  </v-list-tile>
                </v-flex>
                <v-flex xs6>
                  <v-list-tile>
                    <v-list-tile-action>
                      <v-icon color="teal">power</v-icon>
                    </v-list-tile-action>
                    <v-list-tile-content>
                      <v-list-tile-title>{{ syncData.dc_battery_current || 0 }} A</v-list-tile-title>
                      <v-list-tile-sub-title>Current</v-list-tile-sub-title>
                    </v-list-tile-content>
                  </v-list-tile>
                </v-flex>
              </v-layout>
              <v-list-tile class="double-line" v-if="syncData.cumulative_energy_charged > 0 || syncData.cumulative_energy_discharged > 0">
                <v-list-tile-action>
                  <v-icon color="teal">battery_unknown</v-icon>
                </v-list-tile-action>
                <v-list-tile-content>
                  <v-list-tile-title>{{ syncData.cumulative_energy_charged || 0 }} kWh / {{ syncData.cumulative_energy_discharged || 0 }} kWh </v-list-tile-title>
                  <v-list-tile-sub-title>Charged / discharged all time</v-list-tile-sub-title>
                </v-list-tile-content>
              </v-list-tile>
              <v-subheader class="mt-2">Battery health</v-subheader>
              <v-layout row wrap>
                <v-flex xs6>
                  <v-list-tile>
                    <v-list-tile-action>
                      <v-icon color="teal">favorite</v-icon>
                    </v-list-tile-action>
                    <v-list-tile-content>
                      <v-list-tile-title>{{ syncData.soh || 0 }} %</v-list-tile-title>
                      <v-list-tile-sub-title>State of Health</v-list-tile-sub-title>
                    </v-list-tile-content>
                  </v-list-tile>
                </v-flex>
                <v-flex xs6>
                  <v-list-tile>
                    <v-list-tile-action>
                      <v-icon color="teal">flash_auto</v-icon>
                    </v-list-tile-action>
                    <v-list-tile-content>
                      <v-list-tile-title>{{ syncData.aux_battery_voltage || 0 }} V</v-list-tile-title>
                      <v-list-tile-sub-title>Aux Voltage</v-list-tile-sub-title>
                    </v-list-tile-content>
                  </v-list-tile>
                </v-flex>
              </v-layout>
            </v-list>
            <v-divider class="mt-1 mb-3"></v-divider>
            <v-list two-line subheader v-if="loaded && Object.keys(logs).length">
              <v-subheader v-if="loaded && Object.keys(logs).length">Latest log</v-subheader>
              <div v-for="(month, index) in logs" :key="index">
                <v-list-tile v-for="log in logs[index].slice(0,1)" :key="log.id" avatar @click="$router.push({name: 'log', query: {id: log.id}})">
                  <v-list-tile-avatar>
                    <v-icon class="teal lighten-1 white--text">{{ convertIcon(log.charge) }}</v-icon>
                  </v-list-tile-avatar>
                  <v-list-tile-content>
                    <v-list-tile-title>{{ log.title }}</v-list-tile-title>
                    <v-list-tile-sub-title>{{ convertDates(log.start, log.end) }}</v-list-tile-sub-title>
                  </v-list-tile-content>
                  <v-list-tile-action>
                    <v-btn icon ripple @click="$router.push({name: 'log', query: {id: log.id}})">
                      <v-icon color="grey lighten-1">info</v-icon>
                    </v-btn>
                  </v-list-tile-action>
                </v-list-tile>
                <div class="last-tile"></div>
              </div>
            </v-list>
          </div>
        </v-card-title>
      </v-card>
    </v-flex>
  </v-layout>
</template>

<script>
  import storage from '../utils/storage';
  import cars from '../utils/cars';
  import general from '../utils/general';

  export default {
    data: () => ({
      syncData: {
        soc_bms: 0,
        soc_display: 0,
        dc_battery_power: 0,
        battery_min_temperature: 0,
        battery_max_temperature: 0,
        battery_inlet_temperature: 0,
        charging: 0,
        last_extended: 0,
        last_soc: 0,
        dc_battery_current: 0,
        dc_battery_voltage: 0,
        cumulative_energy_charged: 0,
        cumulative_energy_discharged: 0,
        aux_battery_voltage: 0,
        soh: 0
      },
      fetchInterval: 0,
      updatedTimestamp: '',
      dataOutdatedMessage: '',
      dataOutdatedMessageTimestamp: '',
      settings: storage.getValue('settings', {}),
      showSOCExplaination: false,
      logs: {},
      loaded: false
    }),
    computed: {
      cycleColor() {
        const soc = this.syncData.soc_display || this.syncData.soc_bms;

        if (soc < 15) return 'red';
        else if (soc < 30) return 'orange';
        else if (soc < 50) return 'yellow';
        return 'green';
      },
      powerAmount() {
        return (Math.abs(this.syncData.dc_battery_power) || 0).toFixed(2);
      },
      powerAmountColor() {
        if (this.syncData.charging) return 'green';
        return parseFloat(this.syncData.dc_battery_power) <= 0 ? '#448aff' : 'red';
      },
      chargingTimeLeft() {
        return general.chargeTime(this.settings.car, this.syncData.soc_display, this.syncData.soc_bms, this.syncData.dc_battery_power, "timeleft");
      },
      finishTime() {
        return general.chargeTime(this.settings.car, this.syncData.soc_display, this.syncData.soc_bms, this.syncData.dc_battery_power, "finishtime");
      },
      currentRange() {
        const soc = this.syncData.soc_display || this.syncData.soc_bms;

        return parseInt(this.totalRange * ((soc === 100) ? 1 : '0.' + ((soc < 10) ? ('0' + parseInt(soc)) :
          parseInt(soc)))) || 0;
      },
      currentRangeColor() {
        if (this.currentRange < (this.totalRange * 10 / 100)) {
          return 'red';
        }
        return 'green';
      },
      totalRange() {
        return parseInt((cars[this.settings.car].CAPACITY / this.settings.consumption) * 100) || 0;
      },
      rangePerMinute() {
        const time = general.chargeDecimalTime(this.settings.car, this.syncData.soc_display, this.syncData.soc_bms, this.syncData.dc_battery_power);
        return (parseFloat((this.totalRange - this.currentRange) / (60 / 100 * time * 100)) || 0).toFixed(2);
      }
    },
    methods: {
      getTemperatureColor(temperature) {
        if (temperature < 20) return 'blue';
        else if (temperature < 30) return 'green';
        else if (temperature < 35) return 'orange';
        return 'red';
      },
      fetchData() {
        const self = this;

        ['getSOC', 'getExtended'].forEach((method) => {
          self.$root.EVNotify[method]((err, obj) => {
            if (!err && obj) Object.keys(obj).forEach((key) => self.syncData[key] = obj[key]);
            this.updateTimestamp();
            this.dataOutdated();
          });
        });
      },
      getLastUpdate() {
        return this.syncData.last_extended > this.syncData.last_soc ? this.syncData.last_extended : this.syncData.last_soc
      },
      updateTimestamp () {
        const lastUpdate = this.getLastUpdate();

          if (!lastUpdate) this.updatedTimestamp = 'Never updated';
          else this.updatedTimestamp = `Updated ${this.$root.MomentJS(new Date(lastUpdate * 1000)).fromNow()} [${this.$root.MomentJS(new Date(lastUpdate) * 1000).format('HH:mm:ss')}]`;
      },
      dataOutdated() {
        const now = parseInt(new Date() / 1000);
        const lastUpdate = this.getLastUpdate();

        if(!lastUpdate) {
          this.dataOutdatedMessage = `There has never been a connection to a car. Please connect your car first time.`
        } else {
          this.dataOutdatedMessage =
                  `Data outdated. Updated ${this.$root.MomentJS(new Date(lastUpdate * 1000)).fromNow()}.`;
          this.dataOutdatedMessageTimestamp = `(${this.$root.MomentJS(new Date(lastUpdate * 1000)).format('MMMM Do YYYY HH:mm')})`;
        }
        return !lastUpdate || lastUpdate + 600 < now;
      },
      isSupportedCar() {
        return cars[this.settings.car] != null;
      },
      convertIcon(charge) {
        return charge ? 'ev_station' : 'directions_car';
      },
      convertDates(start, end) {
        start = new Date(start * 1000);
        end = new Date(end * 1000);

        return `${this.$root.MomentJS(end).format('MMMM Do YYYY')} ${this.$root.MomentJS(start).format('HH:mm')}-${this.$root.MomentJS(end).format('HH:mm')}`
      }
    },
    mounted() {
      if (!storage.getValue('user')) return;
      this.fetchInterval = setInterval(this.fetchData, 10000);
      this.fetchData();

      var self = this;

      self.$root.EVNotify.getLogs(0, (err, driveLogs) => {
        if (!err && driveLogs) {
          self.$root.EVNotify.getLogs(1, (err, chargeLogs) => {
            if (!err && chargeLogs) {
              const combinedLogs = chargeLogs.concat(driveLogs)
                      .sort((a, b) => b.end - a.end);
              const logs = {};

              combinedLogs.forEach((log) => {
                const date = new Date(log.end * 1000);
                const index = `${date.getMonth()}_${date.getFullYear()}`;

                if (!logs[index]) logs[index] = [];
                logs[index].push(log);
              });
              self.loaded = true;
              self.logs = logs;
            }
          });
        }
      });
    },
    beforeDestroy() {
      clearInterval(this.fetchInterval);
    }
  }
</script>

<style scoped>
  .v-alert {
    width: 100%;
    padding:5px;
  }

  .v-card.main-card {
    height: 100%;
  }

  .upper-part,
  .bottom-part {
    width: 100%;
  }

  .updated-timestamp {
    padding: 0 16px;
  }

  .progress-cycle-container.left {
    padding-top: 16px;
  }

  .progress-cycle-text {
    text-align: center;
    padding-top: 6px;
  }

  .progress-cycle-text-container p {
    margin-bottom: 0;
    text-align: center;
    color: #1976d2;
  }

  .temperature-text {
    display: inline;
  }

  .last-tile {
    padding-bottom: 56px;
  }
  .v-card__title--primary {
    padding-top: 5px;
  }
  .v-subheader {
    height: 20px;
  }
  .socexplainationmodal {
    position: absolute;
    margin-left: -5px;
    margin-top: -10px;
  }
  .v-list__tile__action {
    min-width: 35px;
  }
  .v-list__tile__action {
    min-width: 35px;
  }
  .full-height {
    min-height: 100vh;
  }
</style>

<style>
  .v-list--two-line .v-list__tile {
    height: 60px;
  }
  .v-list--two-line .double-line .v-list__tile {
    height: 70px;
  }
</style>