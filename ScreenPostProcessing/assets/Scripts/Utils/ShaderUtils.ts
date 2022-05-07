/**
 * @description 一些处理 effect/material 的通用函数
 */
export class ShaderUtils
{
    /**
     * 跳过资源加载 effect 文件，使用事先编译好的 cc.EffectAsset 文件的 json 格式文件来创建 cc.Material
     * @param effectJson 
     * @returns 
     */
    public static createMaterialByJson(effectJson: any): cc.Material
    {
        // @ts-ignore
        let asset = cc.deserialize(effectJson, { priority: 0, responseType: "json" });
        typeof asset.onLoad === "function" && asset.onLoad();
        asset.__onLoadInvoked__ = true;
        return cc.Material.create(asset, 0);
    }
}