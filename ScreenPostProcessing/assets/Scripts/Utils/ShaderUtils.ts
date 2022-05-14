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

    /**
     * 创建宽高为2的单色 texture
     * @returns 
     */
    public static createSingleTexture(): cc.Texture2D 
    {
        const data: Uint8Array = new Uint8Array(2 * 2 * 4);
        for (let i = 0; i < 2; ++i) 
        {
            for (let j = 0; j < 2; ++j) 
            {
                data[i * 2 * 4 + j * 4 + 0] = 255;
                data[i * 2 * 4 + j * 4 + 1] = 255;
                data[i * 2 * 4 + j * 4 + 2] = 255;
                data[i * 2 * 4 + j * 4 + 3] = 255;
            }
        }
        
        const texture = new cc.Texture2D();
        texture.name = "single color";
        texture.initWithData(data, cc.Texture2D.PixelFormat.RGBA8888, 2, 2);
        
        return texture;
    }
}