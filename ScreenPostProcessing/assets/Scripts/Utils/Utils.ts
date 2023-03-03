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

    /** 随机打乱数组顺序, 洗牌算法 */
    public static randomArray(arr: any[]): any[]
    {
        let n: number = arr.length,
            random: number;
        while (0 !== n)
        {
            random = Math.random() * (n--) | 0;
            [arr[random], arr[n]] = [arr[n], arr[random]];
        }
        return arr;
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
                    return orgFunc(...args);
                };
            })(console.log);
        }
        else
        {
            cc.log = this._oldLogFunc;
        }
    }

    private static _tempRT: cc.RenderTexture = null;
    /** 
     * 获取纹理像素数据 
     * cocos creator 2.4.6 web和模拟器可以正常获取像素信息
     * 同一帧频繁使用会引起卡顿
     */
    public static getTexturePixelData(texture: cc.Texture2D): Uint8Array
    {
        if (!cc.isValid(texture)) throw new Error("texture is invalid");

        const w: number = texture.width;
        const h: number = texture.height;
        let rt: cc.RenderTexture = this._tempRT;

        if (cc.isValid(rt))
        {
            rt.updateSize(w, h);
        }
        else
        {
            this._tempRT = rt = new cc.RenderTexture();
            rt.initWithSize(w, h, cc.RenderTexture.DepthStencilFormat.RB_FMT_S8);
        }

        cc.renderer["device"].setFrameBuffer(rt["_framebuffer"]);
        rt.drawTextureAt(texture, 0, 0);

        return rt.readPixels();
    }

    /** 获取 url 指定 key 的 value */
    public static getQueryVariable(key: string): string
    {
        let query = window.location.search.substring(1),
            vars = query.split('&');

        for (let i = 0, l = vars.length; i < l; i++)
        {
            let pair = vars[i].split('=');

            if (decodeURIComponent(pair[0]) === key)
            {
                return decodeURIComponent(pair[1]);
            }
        }

        return "";
    }

    /** 获取 url 中参数对象 */
    public static getQueryParamDict(): any
    {
        let query = window.location.search.substring(1);
        let kvPairs = query.split('&');
        let toRet = {};
        for (let i = 0; i < kvPairs.length; ++i)
        {
            let kAndV = kvPairs[i].split('=');
            if (undefined === kAndV || null === kAndV || 2 !== kAndV.length) return null;
            let k = kAndV[0];
            let v = decodeURIComponent(kAndV[1]);
            toRet[k] = v;
        }
        return toRet;
    }

    /**
     * 格式化数字 ["K", "M", "G", "T", "P", "E"]
     * @param places 保留小数点后几位
     */
    public static formateNumber(num: number, places: number): string
    {
        const format = [
            {
                value: 1,
                symbol: ""
            },
            {
                value: 1e3,
                symbol: "K"
            },
            {
                value: 1e6,
                symbol: "M"
            },
            {
                value: 1e9,
                symbol: "G"
            }, {
                value: 1e12,
                symbol: "T"
            }, {
                value: 1e15,
                symbol: "P"
            }, {
                value: 1e18,
                symbol: "E"
            }
        ];
        let i: number = format.length - 1;
        while (i > 0 && !(num >= format[i].value))
        {
            --i;
        }
        return (num / format[i].value)
            .toFixed(places)
            .replace(/\.0+$|(\.[0-9]*[1-9])0+$/, "$1")
            + format[i].symbol
            ;
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
};

export const measure = function (
    target: Object,
    propertyKey: string,
    descriptor: PropertyDescriptor
): PropertyDescriptor
{
    const oldFunc: Function = descriptor.value;
    descriptor.value = function (...args: any[])
    {
        const start: number = performance.now();
        const result: any = oldFunc.apply(this, args);
        const finish: number = performance.now();
        console.log(`${propertyKey} Execution time: ${finish - start} milliseconds`);
        return result;
    };

    return descriptor;
};

window["Utils"] = Utils;