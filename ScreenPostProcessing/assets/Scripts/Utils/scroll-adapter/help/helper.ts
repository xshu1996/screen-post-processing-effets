import { ILike } from "../define/interface"

export class Helper {
    static readonly Epsilon = 1.401298E-45
    static readonly Infinity = 1 / 0
    static smoothStep(from: number, to: number, t: number) {
        t = this.clamp01(t)
        t = -2 * t * t * t + 3 * t * t
        return to * t + from * (1 - t)
    }
    static smoothDamp(current: number, target: number, currentVelocity: number, smoothTime: number, maxSpeed: number, deltaTime: number): { velocity: number, position: number } {
        smoothTime = Math.max(0.0001, smoothTime)
        var num = 2 / smoothTime
        var num2 = num * deltaTime
        var num3 = 1 / (1 + num2 + 0.48 * num2 * num2 + 0.235 * num2 * num2 * num2)
        var value = current - target
        var num4 = target
        var num5 = maxSpeed * smoothTime
        value = this.clamp(value, 0 - num5, num5)
        target = current - value
        var num6 = (currentVelocity + num * value) * deltaTime
        currentVelocity = (currentVelocity - num * num6) * num3
        var num7 = target + (value + num6) * num3
        if (num4 - current > 0 == num7 > num4) {
            num7 = num4
            currentVelocity = (num7 - num4) / deltaTime
        }
        return { velocity: currentVelocity, position: num7 }
    }
    static clamp01(value: number) {
        return this.clamp(value, 0, 1)
    }
    static clamp(num, min = 0, max = 1) {
        return Math.min(Math.max(num, min), max)
    }
    static sign(f) {
        return (f >= 0) ? 1 : (-1)
    }
    static lerp(a: number, b: number, t: number) {
        return a + (b - a) * this.clamp01(t)
    }
    static approximately(a: number, b: number) {
        return Math.abs(b - a) < Math.max(100E-6 * Math.max(Math.abs(a), Math.abs(b)), this.Epsilon * 8)
    }
    static round(value, n) {
        return Math.round(value * Math.pow(10, n)) / Math.pow(10, n)
    }
    static pingpang(v: number) {
        var value = v
        value = Math.abs(v)
        var integer = Math.trunc(value)
        if (integer % 2 == 0) {
            value = value - integer
        } else {
            value = (1 - (value - integer))
        }
        return value
    }
    static isNumber(value: any) {
        return typeof value == "number" && !isNaN(value)
    }
    static progress(start: number, end: number, current: number, t: number) {
        return current = start + (end - start) * t
    }
    static sizeToVec(size: cc.Size): ILike {
        if (!size) return { x: 0, y: 0 }
        return { x: size.width, y: size.height }
    }
}