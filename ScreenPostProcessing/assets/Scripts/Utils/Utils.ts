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
}

declare global
{
    interface String
    {
        formatByParam(...arg);
    }
}

Object.defineProperty(String.prototype, "formatByParam", {
    writable: false,
    value: function ()
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
});