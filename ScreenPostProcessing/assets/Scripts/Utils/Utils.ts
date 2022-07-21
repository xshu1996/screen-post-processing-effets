export class Utils
{
    private static _gid: number = 0;
    /** 获取一个全局唯一ID */
    public static getGID(): number
    {
        return this._gid++;
    }

    /**
     * 生成一个用不重复的ID
     */
    public static genNonDuplicateID(len: number): string
    {
        return Number(Math.random().toString().substr(3, len) + Date.now()).toString(36);
    }

    /**
     * base64 数据转 Uint8Array
     */
    public static base64ToUint8Array(base64Str: string): Uint8Array
    {
        const padding = "=".repeat((4 - base64Str.length % 4) % 4);
        const base64 = (base64Str + padding)
            .replace(/\-/g, "+")
            .replace(/_/g, "/");

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i)
        {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    /**
     *  ArrayBuffer 转 base64
     */
    public static arrayBufferToBase64(buffer: ArrayBuffer): string
    {
        let binary = "";
        let bytes = new Uint8Array(buffer);
        let len = bytes.byteLength;
        for (let i = 0; i < len; i++)
        {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    /**
    * @description 快速获取某个数据对象中深层 key 的值
    * @param src 数据对象
    * @param key 要获取值对应的 key，层级通过 # 分割
    */
    public static key4property(src: any, key: string): any
    {
        if (!src) return undefined;
        let keys = key.split('#');
        for (let i = 0, j = keys.length; i < j; i++)
        {
            src = src[keys[i]];
            if (typeof src == 'object' && src != null) continue;
            if (i < j - 1) return undefined;
        }
        return src;
    }

    /**
     * 获取闭区间内的随机数
     */
    public static randomSection(min: number, max: number): number
    {
        if (min > max)
        {
            [min, max] = [max, min];
        }

        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    private static _useFrameLog: boolean = false;
    private static _oldLogFunc = cc.log;

    public static set useFrameLog(v: boolean) 
    {
        if (this._useFrameLog === v) return;
        this._useFrameLog = v;
        if (v)
        {
            cc.log = (function (orgFunc)
            {
                let frames = -1;
                let color = '#eeeeee';
                let apartLine = '_'.repeat(100);
                return function (...args)
                {
                    if (cc.director.getTotalFrames() !== frames)
                    {
                        frames = cc.director.getTotalFrames();
                        if (cc.sys.isBrowser)
                        {
                            orgFunc(`%c${apartLine}`, `color:${color}; background:${color}`);
                        }
                        else
                        {
                            orgFunc(apartLine);
                        }
                    }
                    return orgFunc(...args)
                }
            })(console.log);
        }
        else
        {
            cc.log = this._oldLogFunc;
        }
    }

}

declare global
{
    interface String
    {
        formatByParam(...arg);
    }
}

String.prototype["formatByParam"] = function ()
{
    if (arguments.length === 0)
    {
        return this;
    }

    var param = arguments[0],
        str = this;
    if (typeof (param) === "object")
    {
        for (var key in param)
        {
            if (Object.prototype.hasOwnProperty.call(param, key))
            {
                str = str.replace(new RegExp("\\{" + key + "\\}", "g"), param[key]);
            }
        }
        return str;
    }
    else
    {
        for (var i = 0, len = arguments.length; i < len; ++i)
        {
            str = str.replace(new RegExp("\\{" + i + "\\}", "g"), arguments[i]);
        }
        return str;
    }
}

window["Utils"] = Utils;