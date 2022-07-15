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

    /**
     * 获取随机 color
     */
    public static randomColor(): cc.Color
    {
        return new cc.Color(
            Math.floor(Math.random() * 256), // generate 0~255 number
            Math.floor(Math.random() * 256),
            Math.floor(Math.random() * 256),
            Math.floor(Math.random() * 256)
        );
    }

    /**
     * 生成颜色条纹噪声图
     * @param stripLength number 条纹长度
     * @param size cc.Size 噪声图尺寸
     * @param recycleRt cc.RenderTexture 可选，是否复用传入 renderTexture
     * @returns the noise renderTexture
     */
    public static genColorNoiseRT(stripLength: number, size: cc.Size, recycleRt?: cc.RenderTexture): cc.RenderTexture
    {
        let _noiseRT = cc.isValid(recycleRt) ? recycleRt : new cc.RenderTexture();
        let w = size.width | 0,
            h = size.height | 0;
        const pixelData = new Uint8Array(w * h * 4);
        let randCol = this.randomColor();
        for (let i: number = 0; i < h; ++i)
        {
            for (let j: number = 0; j < w; ++j)
            {
                if (Math.random() > stripLength)
                {
                    randCol = this.randomColor();
                }

                let start: number = i * w * 4 + j * 4;
                pixelData[start]     = randCol.r;
                pixelData[start + 1] = randCol.g;
                pixelData[start + 2] = randCol.b;
                pixelData[start + 3] = 255.0;
            }
        }
        _noiseRT.initWithData(pixelData, cc.Texture2D.PixelFormat.RGBA8888, w, h);
        _noiseRT.packable = false;

        return _noiseRT;
    }
}