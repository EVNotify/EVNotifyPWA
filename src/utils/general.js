import cars from './cars';
import MomentJS from 'moment';

export default {
    capacity(car, configuredCapacity) {
        if (Number(configuredCapacity) > 0 && Number.isFinite(Number(configuredCapacity))) return Number(configuredCapacity);
        return cars[car] ? cars[car].CAPACITY : null;
    },
    chargeTime(car, socDisplay, socBMS, batteryPower, typeOfTime, configuredCapacity) {
        const hours = this.chargeDecimalTime(car, socDisplay, socBMS, batteryPower, configuredCapacity);
        if (hours == null) return '–';
        if (typeOfTime === 'timeleft') {
            const minutes = Math.round(hours * 60);
            return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
        }
        if (typeOfTime === 'finishtime') return MomentJS().add(hours, 'hours').format('HH:mm');
        return false;
    },
    chargeDecimalTime(car, socDisplay, socBMS, batteryPower, configuredCapacity) {
        const capacity = this.capacity(car, configuredCapacity);
        const soc = socDisplay != null ? socDisplay : socBMS;
        const power = Math.abs(Number(batteryPower)) || (cars[car] && cars[car].FAST_SPEED);
        if (!capacity || !Number.isFinite(soc) || soc < 0 || soc > 100 || !Number.isFinite(power) || power <= 0) return null;
        return capacity * (1 - soc / 100) / power;
    },
    range(car, consumption, configuredCapacity) {
        const capacity = this.capacity(car, configuredCapacity);
        if (!capacity || !Number.isFinite(Number(consumption)) || Number(consumption) <= 0) return null;
        return Math.floor(capacity / Number(consumption) * 100);
    }
};
