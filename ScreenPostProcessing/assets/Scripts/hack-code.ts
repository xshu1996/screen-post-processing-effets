export class HackCode
{
    private static _timeScale: number = 1;
    /** 设置时间缩放参数 */
    public static set timeScale(scale: number)
    {
        this._timeScale = scale;
        this.setEngineTimeScale(scale);
    }
    public static get timeScale(): number
    {
        return this._timeScale;
    }

    /** @internal */
    private static setEngineTimeScale(scale: number): void
    {
        cc.director["calculateDeltaTime"] = function (now: number)
        {
            if (!now) now = performance.now();

            this._deltaTime = now > this._lastUpdate ? (now - this._lastUpdate) / 1000 : 0;
            if (CC_DEBUG && (this._deltaTime > 1))
                this._deltaTime = 1 / 60.0;

            this._deltaTime *= scale;
            this._lastUpdate = now;
        };
    }
}