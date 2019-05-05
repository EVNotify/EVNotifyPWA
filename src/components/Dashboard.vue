<template>
  <v-layout>
    <v-flex xs12 sm6 offset-sm3>
      <v-card>
        <v-card-title primary-title>
          <div class="upper-part">
            <div class="progress-cycle-container left">
              <v-progress-circular :rotate="-90" :size="100" :width="15"
                :value="syncData.soc_display || syncData.soc_bms" :color="cycleColor">
                <div class="progress-cycle-text-container">
                  <p>{{ syncData.soc_display ||syncData.soc_bms }}</p>
                  <v-icon color="primary" v-if="syncData.charging">flash_on</v-icon>
                </div>
              </v-progress-circular>
              <p class="caption progress-cycle-text" v-if="syncData.soc_display">SOC Display</p>
              <p class="caption progress-cycle-text" v-else>SOC BMS</p>
            </div>
            <div class="progress-cycle-container right">
              <v-list>
                <v-list-tile>
                  <v-list-tile-action>
                    <v-icon color="teal">flash_on</v-icon>
                  </v-list-tile-action>
                  <v-list-tile-content>
                    <v-list-tile-title :style="{color: powerAmountColor}">{{ powerAmount }} kW</v-list-tile-title>
                  </v-list-tile-content>
                </v-list-tile>
                <v-list-tile>
                  <v-list-tile-action>
                    <v-icon color="teal">drive_eta</v-icon>
                  </v-list-tile-action>
                  <v-list-tile-content>
                    <v-list-tile-title>33 / 259 km</v-list-tile-title>
                    <span class="font-weight-light font-italic">10.8kWh / 100 km</span>
                  </v-list-tile-content>
                </v-list-tile>
                <v-list-tile>
                  <v-list-tile-action>
                    <v-icon color="teal">schedule</v-icon>
                  </v-list-tile-action>
                  <v-list-tile-content>
                    <v-list-tile-title>00:32 h</v-list-tile-title>
                  </v-list-tile-content>
                </v-list-tile>
              </v-list>
            </div>
          </div>
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
                      {{ syncData.battery_min_temperature }}
                    </p> /
                    <p class="temperature-text" :style="{color: getTemperatureColor(syncData.battery_max_temperature)}">
                      {{ syncData.battery_max_temperature }}
                    </p> /
                    <p class="temperature-text"
                      :style="{color: getTemperatureColor(syncData.battery_inlet_temperature)}">
                      {{ syncData.battery_inlet_temperature }}
                    </p> °C
                  </v-list-tile-title>
                  <v-list-tile-sub-title>Min / Max / Inlet</v-list-tile-sub-title>
                </v-list-tile-content>
              </v-list-tile>
              <v-subheader>Battery health</v-subheader>
              <v-list-tile>
                <v-list-tile-action>
                  <v-icon color="teal">battery_std</v-icon>
                </v-list-tile-action>
                <v-list-tile-content>
                  <v-list-tile-title>11 %</v-list-tile-title>
                  <v-list-tile-sub-title>SOC BMS</v-list-tile-sub-title>
                </v-list-tile-content>
              </v-list-tile>
              <v-list-tile>
                <v-list-tile-action>
                  <v-icon color="teal">favorite</v-icon>
                </v-list-tile-action>
                <v-list-tile-content>
                  <v-list-tile-title>100 %</v-list-tile-title>
                  <v-list-tile-sub-title>State of Health (SOH)</v-list-tile-sub-title>
                </v-list-tile-content>
              </v-list-tile>
              <v-list-tile>
                <v-list-tile-action>
                  <v-icon color="teal">flash_auto</v-icon>
                </v-list-tile-action>
                <v-list-tile-content>
                  <v-list-tile-title>14.4 V</v-list-tile-title>
                  <v-list-tile-sub-title>Aux Battery Voltage</v-list-tile-sub-title>
                </v-list-tile-content>
              </v-list-tile>
              <v-subheader>Battery data</v-subheader>
              <v-list-tile>
                <v-list-tile-action>
                  <v-icon color="teal">battery_charging_full</v-icon>
                </v-list-tile-action>
                <v-list-tile-content>
                  <v-list-tile-title>371.21 V</v-list-tile-title>
                  <v-list-tile-sub-title>Battery voltage</v-list-tile-sub-title>
                </v-list-tile-content>
              </v-list-tile>
              <v-list-tile>
                <v-list-tile-action>
                  <v-icon color="teal">power</v-icon>
                </v-list-tile-action>
                <v-list-tile-content>
                  <v-list-tile-title>-124.80 A</v-list-tile-title>
                  <v-list-tile-sub-title>Battery current</v-list-tile-sub-title>
                </v-list-tile-content>
              </v-list-tile>
              <v-list-tile class="last-tile">
                <v-list-tile-action>
                  <v-icon color="teal">battery_unknown</v-icon>
                </v-list-tile-action>
                <v-list-tile-content>
                  <v-list-tile-title>5109 kWh</v-list-tile-title>
                  <v-list-tile-sub-title>Cumulative energy charged</v-list-tile-sub-title>
                </v-list-tile-content>
              </v-list-tile>
            </v-list>
          </div>
        </v-card-title>
      </v-card>
    </v-flex>
  </v-layout>
</template>

<script>
  export default {
    data: () => ({
      syncData: {
        soc_bms: 12,
        soc_display: 11,
        dc_battery_power: 46.33,
        battery_min_temperature: 19,
        battery_max_temperature: 21,
        battery_inlet_temperature: 16,
        charging: 1
      }
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
        return Math.abs(this.syncData.dc_battery_power) || 0;
      },
      powerAmountColor() {
        if (this.syncData.charging) return 'green';
        return 'red';
      }
    },
    methods: {
      getTemperatureColor(temperature) {
        if (temperature < 20) return 'blue';
        else if (temperature < 30) return 'green';
        else if (temperature < 35) return 'orange';
        return 'red';
      }
    }
  }
</script>

<style scoped>
  .layout {
    width: 100%;
  }

  .upper-part,
  .bottom-part {
    width: 100%;
  }

  .progress-cycle-container.left {
    padding-top: 16px;
    float: left;
  }

  .progress-cycle-container.right {
    float: right;
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
</style>