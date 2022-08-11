import { Utils } from "./Utils";

export interface IShake
{
    target: cc.Node,
    /** 持续时间，单位 ms */
    duration: number,
    /** 速度 */
    speed?: number,
    /** 震动区间 */
    magnitude?: number,
    /** 是否循环, 小于 0 无限循环 */
    loopTime?: number;
    /** 延迟播放 ms */
    delay?: number,
}

export interface IJelly
{
    target: cc.Node,
    /** 持续时间，单位 ms */
    duration: number,
    /** 频率 */
    frequency?: number,
    /** 衰减 */
    decayFactor?: number,
    /** 挤压 */
    pressScale?: number,
    /** 延迟播放 ms */
    delay?: number,
    /** 是否循环, 小于 0 无限循环 */
    loopTime?: number,
}

export interface IYoYo
{
    target: cc.Node,
    duration: number,
    props: { [key: string]: number; };
    /** 延迟播放 ms */
    delay?: number,
    /** 循环次数， 默认 1 次 */
    loopTime?: number,
    easing?: cc.Easing,
    /** 重复动作的间隔 ms */
    interval?: number,
}

export class EffectUtils
{
    /** 震动 action 时间单位 MS */
    public static shake(shakeParams: IShake): cc.Tween
    {
        const {
            target, duration,
            speed = 1,
            magnitude = 5,
            loopTime = 1,
            delay = 0
        } = shakeParams;

        if (!cc.isValid(target)) 
        {
            cc.error(new Error("target is invalid"));
            return null;
        }

        const originalPos: cc.Vec2 = target.getPosition();
        const deltaTime: number = cc.director.getAnimationInterval();

        const random1 = Utils.randomSection(-180, 180) / Math.PI;
        const random2 = Utils.randomSection(-180, 180) / Math.PI;

        const shake: cc.Tween = cc.tween();
        let elapsed = 0;
        for (; elapsed < duration; elapsed += deltaTime)
        {
            const percent: number = elapsed / duration;
            const ps: number = percent * speed * 200;

            const range1 = Math.sin(random1 + ps),
                range2 = Math.cos(random2 + ps);

            let moveDelta: cc.Vec2;
            if (percent < 0.5)
            {
                moveDelta = cc.v2(range1 * magnitude, range2 * magnitude);
            }
            else
            {
                const magDecay: number = magnitude * (2 * (1 - percent));
                moveDelta = cc.v2(range1 * magDecay, range2 * magDecay);
            }

            shake.then(cc.tween().to(deltaTime / 1000, { position: moveDelta.addSelf(originalPos) }));
        }

        // recover target position
        shake.then(cc.tween().to((duration + deltaTime - elapsed) / 1000, { position: originalPos }));
        // emit completed event
        shake.then(cc.tween().call(function ()
        {
            if (cc.isValid(target)) target.emit("shake_action_completed");
        }));

        const repeatTime: number = loopTime > 0 ? loopTime : 10e8;
        const ret = cc.tween(target)
            .delay(delay / 1000)
            .repeat(repeatTime, shake)
            .call(function () 
            {
                if (cc.isValid(target)) target.emit("shake_action_ended");
            })
            .start()
            ;

        return ret;
    }

    /** 果冻动作 时间单位 MS */
    public static jellyTo(jellyParams: IJelly): cc.Tween
    {
        const { target, duration,
            frequency = 3,
            decayFactor = 1.5,
            pressScale = 0.25,
            delay = 0,
            loopTime = 1
        } = jellyParams;

        if (!cc.isValid(target)) 
        {
            cc.error(new Error("target is invalid"));
            return null;
        }

        const repeatTime: number = loopTime > 0 ? loopTime : 10e8;
        const originalScale: cc.Vec2 = cc.v2(target.scaleX, target.scaleY);
        // 时长
        const pressTime: number = duration * 20e-5;         // 收缩时长
        const scaleBackTime: number = duration * 15e-5;    // 缩放至原始大小时长
        const bouncingTime: number = duration * 65e-5;     // 弹动时长
        // 振幅
        const amplitude: number = pressScale / scaleBackTime;

        const ret = cc.tween(target)
            .delay(delay / 1000)
            .repeat(repeatTime,
                cc.tween()
                    .to(pressTime, {
                        scaleX: originalScale.x * (1 + pressScale),
                        scaleY: originalScale.y * (1 - pressScale)
                    }, { easing: "sineOut" })
                    .to(scaleBackTime, { scaleX: originalScale.x, scaleY: originalScale.y })
                    .to(bouncingTime, {
                        scaleX: {
                            value: originalScale.x,
                            progress: (start: number, end: number, current: number, t: number) =>
                            {
                                return end - this._getDifference(frequency, decayFactor, amplitude, t);
                            }
                        },
                        scaleY: {
                            value: originalScale.y,
                            progress: (start: number, end: number, current: number, t: number) =>
                            {
                                return end + this._getDifference(frequency, decayFactor, amplitude, t);
                            }
                        }
                    })
                    .call(function ()
                    {
                        if (cc.isValid(target)) target.emit("jelly_action_completed");
                    })
            )
            .call(function ()
            {
                if (cc.isValid(target)) target.emit("jelly_action_ended");
            })
            .start()
            ;

        return ret;
    }

    /**
     * 获取目标时刻弹性幅度
     * @param amplitude 幅度
     * @param time 时间
     */
    private static _getDifference(frequency: number, decay: number, amplitude: number, time: number): number
    {
        // 角速度（ω=2nπ）
        const angularVelocity = frequency * Math.PI * 2;
        return amplitude * (Math.sin(time * angularVelocity) / Math.exp(decay * time) / angularVelocity);
    }

    /** yoYo 往复动作 */
    public static yoYoTo(params: IYoYo): cc.Tween
    {
        const { target, duration, props,
            delay = 0,
            loopTime = 1,
            easing = null,
            interval = 0
        } = params;

        if (!cc.isValid(target)) 
        {
            cc.error(new Error("target is invalid"));
            return null;
        }

        const repeatTime: number = loopTime > 0 ? loopTime : 10e8;
        const yoYoProps = [];
        for (const p in props)
        {
            if ((typeof (target[p]) == 'number'))
            {
                const start = target[p];
                const end = props[p];
                yoYoProps.push([p, start, end]);
            }
        }
        const forwardP = {};
        const backwardP = {};
        for (const p of yoYoProps)
        {
            forwardP[p[0]] = p[2];
            backwardP[p[0]] = p[1];
        }
        const opt: any = {};
        if (easing) opt.easing = easing;

        const ret = cc.tween(target)
            .delay(delay / 1000)
            .repeat(
                repeatTime,
                cc.tween()
                    .to(duration / 1000, forwardP, opt)
                    .to(duration / 1000, backwardP, opt)
                    .call(function ()
                    {
                        if (target) target.emit("yoYo_action_completed");
                    })
                    .delay(interval / 1000)
            )
            .call(function ()
            {
                if (target) target.emit("yoYo_action_ended");
            })
            .start()
            ;
        return ret;
    }
}