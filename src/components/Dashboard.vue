<template>
  <v-layout>
    <v-flex xs12 sm6 offset-sm3>
      <v-card>
        <v-card-title primary-title>
          <div class="upper-part">
            <div class="progress-cycle-container left">
              <v-progress-circular :rotate="-90" :size="100" :width="15" :value="syncData.soc_bms" color="primary">
                <div class="progress-cycle-text-container">
                  <p>{{ syncData.soc_bms }}</p>
                  <v-icon color="primary">flash_on</v-icon>
                </div>
              </v-progress-circular>
              <p class="caption progress-cycle-text">SOC Display</p>
            </div>
            <div class="progress-cycle-container right">
              <v-list>
                <v-list-tile>
                  <v-list-tile-action>
                    <v-icon color="teal">flash_on</v-icon>
                  </v-list-tile-action>
                  <v-list-tile-content>
                    <v-list-tile-title>-46.33 kW</v-list-tile-title>
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
                  <v-list-tile-title>14 / 15 / 16 °C</v-list-tile-title>
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
              <v-list-tile>
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
        soc_bms: 12
      }
    })
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
  }
</style>