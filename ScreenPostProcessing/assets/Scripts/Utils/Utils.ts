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
}