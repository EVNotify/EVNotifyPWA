import cars from '../utils/cars';
import MomentJS from 'moment';

export default {
    /**
     * Calculates chargetime left and finishtime while charging
     * @param {String} car the cartype to get the chargetime to
     * @param {String} socDisplay the state of charge from display
     * @param {String} socBMS the state of charge from BMS
     * @param {String} batteryPower the charging speed
     * @param {String} typeOfTime the result timeType that gets returned
     * @returns {*} the defined and calculated timeType
     */
    chargeTime(car, socDisplay, socBMS, batteryPower, typeOfTime) {
        const duration = MomentJS.duration(parseFloat(this.chargeDecimalTime(car, socDisplay, socBMS, batteryPower))).asMilliseconds();
        const now = new Date().getTime();
        if(typeOfTime == "timeleft") {
            return MomentJS().startOf('day').add(duration, 'minutes').format('m:ss');
        } else if (typeOfTime == "finishtime") {
            return MomentJS(now).add(duration, 'hours').format('HH:mm');
        } else {
            return false;
        }
    },
    chargeDecimalTime(car, socDisplay, socBMS, batteryPower) {
        const capacity = cars[car].CAPACITY;
        const soc = socDisplay || socBMS;
        const amountToCharge = capacity - parseFloat(
            capacity * ((soc === 100) ? 1 : '0.' + ((soc < 10) ? ('0' + parseInt(soc)) : parseInt(soc)))
        ).toFixed(2) || 0;
        const decimalTime = parseFloat(
            amountToCharge / (Math.abs(batteryPower) || cars[car].FAST_SPEED)
        ).toFixed(2);
        return decimalTime;
    }
}