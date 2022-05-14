/**
 * @author xshu
 * @version 0.0.1
 * @description 屏幕后处理 高斯模糊弹窗背景 流程： 截图->应用材质->截图
 */

const { ccclass, property } = cc._decorator;
const OFF_SET: number = 1; // 图片扩边长度

interface IRenderParam
{
    renderNode: cc.Node,
    frameSize: cc.Size, // IMPORTANT 一定要传入整数！！！！
    forceSnapShot?: boolean,
    isClear?: boolean,
}

export enum EffectType
{
    BlurGauss = 0,  // 高斯模糊
    PencilSketch,   // 手绘风格
    Glitch,         // 电子故障
}

@ccclass
export class ScreenPostProcessing extends cc.Component
{

    private static instance: ScreenPostProcessing = null;
    public static getInstance(): ScreenPostProcessing
    {
        return this.instance;
    }
    public static effectType: EffectType = EffectType.BlurGauss;

    @property(cc.Material)
    public p_mtlBlurGauss: cc.Material = null;

    @property(cc.Material)
    public p_mtlPencilSketch: cc.Material = null;

    @property(cc.Material)
    public p_mtlGlitch: cc.Material = null;

    private static _canvas: HTMLCanvasElement = null;


    protected onLoad(): void
    {
        ScreenPostProcessing.instance = this;
    }

    public static setEffectType(type: EffectType): void
    {
        type = cc.misc.clampf(type, 0, Object.keys(EffectType).length / 2 - 1);
        this.effectType = type;
    }

    public static getEffectType(): EffectType
    {
        return this.effectType;
    }

    // uv里面有8个值，分别是左下，右下，左上，右上4个点的x和y坐标，
    public static getUVOffset(frame: cc.SpriteFrame)
    {
        if (!cc.isValid(frame)) return null;

        const ret = {
            isRotated: 0,
            uvOffset: new cc.Vec4(0, 0, 0, 0),
        };

        const frame_uv = frame["uv"];
        ret.uvOffset.x = frame_uv[0]; // xMin
        ret.uvOffset.y = frame_uv[7]; // yMin
        ret.uvOffset.z = frame_uv[6]; // xMax
        ret.uvOffset.w = frame_uv[1]; // yMax

        ret.isRotated = frame.isRotated() ? 1.0 : 0.0;

        return ret;
    }

    /** 无复用截图，每次重新生成 */
    public static getRenderTexture(renderParam: IRenderParam): cc.RenderTexture
    {
        let { renderNode, frameSize, isClear = true } = renderParam;
        const node: cc.Node = this._getShotCameraNode(frameSize);
        const camera: cc.Camera = node.getComponent(cc.Camera);

        let texture: cc.RenderTexture = new cc.RenderTexture();
        camera.targetTexture = texture;

        const worldPos = renderNode.convertToWorldSpaceAR(cc.Vec2.ZERO);
        const localPos = node.parent.convertToNodeSpaceAR(worldPos);
        node.setPosition(localPos);

        texture.initWithSize(frameSize.width, frameSize.height, cc.RenderTexture.DepthStencilFormat.RB_FMT_S8);
        // initWithSize 已经实现了 texture.packable = false;
        texture.setPremultiplyAlpha(true);
        camera["_updateTargetTexture"]();

        camera.render(renderNode);
        if (isClear) camera.targetTexture = null;

        return texture;
    }

    /** 可复用截图 */
    public static getRenderTextureFaster(renderParam: IRenderParam): cc.RenderTexture
    {
        let { renderNode, frameSize, forceSnapShot = false, isClear = false } = renderParam;
        const node: cc.Node = this._getShotCameraNode(frameSize);
        const camera: cc.Camera = node.getComponent(cc.Camera);
        // 如果只考虑实时模糊效果，可以不用每次 new 一个 cc.RenderTexture 复用 camera 的 targetTexture 可优化效率
        let texture: cc.RenderTexture;
        if (!cc.isValid(camera.targetTexture) || forceSnapShot)
        {
            texture = new cc.RenderTexture();
            camera.targetTexture && delete camera.targetTexture['__targetRenderNode'];
            camera.targetTexture = texture;
        } else
        {
            texture = camera.targetTexture;
        }

        const worldPos = renderNode.convertToWorldSpaceAR(cc.Vec2.ZERO);
        const localPos = node.parent.convertToNodeSpaceAR(worldPos);
        node.setPosition(localPos);

        if (texture['__targetRenderNode'] !== renderNode ||
            frameSize.width !== texture.width ||
            frameSize.height !== texture.height)
        {
            // 对图片进行边缘检测，图片部分边缘的梯度会比较大
            // （超出图片 uv 范围取到的纹素为黑色， 如果图片的边缘刚好偏白，那么计算出来的梯度就会很大）
            // 最后使用 shader 处理过后的图片，周边会有很明显的黑线
            // 暂时想到的办法是 截图后，重新填充一遍图片的数据，人工给图片阔边，填充透明
            // 最后进行边缘检测时，图片边缘的梯度平滑
            texture.initWithSize(frameSize.width, frameSize.height, cc.RenderTexture.DepthStencilFormat.RB_FMT_S8);
            // initWithSize 已经实现了 texture.packable = false;
            texture.setPremultiplyAlpha(true);
            camera["_updateTargetTexture"]();
        }
        texture['__targetRenderNode'] = renderNode;
        camera.render(renderNode);
        if (isClear) camera.targetTexture = null;
        // 图片扩边操作
        // let data: Uint8Array = texture.readPixels();
        // // @ts-ignore
        // data = this._extendTexture(data, frameSize.width, frameSize.height);
        // texture.initWithData(data, cc.Texture2D.PixelFormat.RGBA8888, frameSize.width + 2 * OFF_SET, frameSize.height + 2 * OFF_SET);

        return texture;
    }

    // 生成截图节点
    public static getScreenShotNode(renderNode: cc.Node, createNew: boolean, recycleTexture?): cc.Node
    {
        let texture: cc.RenderTexture;
        if (!cc.isValid(recycleTexture))
        {
            texture = this.getRenderTexture({
                renderNode,
                frameSize: cc.size(Math.ceil(renderNode.width), Math.ceil(renderNode.height)),
                forceSnapShot: createNew
            });
        } else
        {
            texture = recycleTexture;
        }

        const ret = new cc.Node("ScreenShotBg");
        const sp = ret.addComponent(cc.Sprite);
        // 半透明图片颜色差异修复
        sp.srcBlendFactor = cc.macro.BlendFactor.ONE;
        // 某些特殊纯色底图会导致穿透
        sp.dstBlendFactor = cc.macro.BlendFactor.ONE_MINUS_DST_ALPHA;

        this._dealTexture(sp, texture);

        const spf = new cc.SpriteFrame();
        spf.setTexture(texture);
        sp.spriteFrame = spf;
        ret.scaleY = -1;

        return ret;
    }

    private static _dealTexture(sp: cc.Sprite, texture: cc.RenderTexture): boolean
    {
        let ret: boolean = true;
        switch (this.effectType)
        {
            case EffectType.BlurGauss:
                sp.setMaterial(0, this.instance.p_mtlBlurGauss);
                this.instance.p_mtlBlurGauss.setProperty("u_resolution", cc.v2(texture.width, texture.height));
                break;
            case EffectType.PencilSketch:
                sp.setMaterial(0, this.instance.p_mtlPencilSketch);
                break;
            case EffectType.Glitch:
                sp.setMaterial(0, this.instance.p_mtlGlitch);
                break;
            default:
                ret = false;
                break;
        }

        return ret;
    }

    // 利用模糊材质处理后 二次截图 减少每帧材质运算的消耗, 需要在截图节点加入到节点树后进行
    public static reRenderNode(renderNode: cc.Node): cc.Node
    {
        if (!cc.isValid(renderNode)) return null;
        const renderSize = renderNode.getContentSize();
        let texture: cc.RenderTexture = this.getRenderTexture({
            renderNode,
            frameSize: cc.size(Math.ceil(renderSize.width), Math.ceil(renderSize.height)),
            forceSnapShot: true,
            isClear: true,
        });
        let sp: cc.Sprite = renderNode.getComponent(cc.Sprite);
        // recover texture material
        sp.setMaterial(0, cc.Material.getBuiltinMaterial('2d-sprite'));
        sp.spriteFrame.setTexture(texture);
        sp["_updateMaterial"]();
        renderNode.scaleY = -1;

        return renderNode;
    }

    public static saveImgByRT(rt: cc.RenderTexture, fileName: string = "image.png")
    {
        const rawWidth: number = rt.width;
        const rawHeight: number = rt.height;

        // 如果超过最大尺寸，则截取中心安全区域
        const MAX_WIDTH: number = 2048;
        const MAX_HEIGHT: number = 2048;

        // 计算安全区域
        const safeWidth: number = cc.misc.clampf(rawWidth, 0, MAX_WIDTH);
        const safeHeight: number = cc.misc.clampf(rawHeight, 0, MAX_HEIGHT);

        const offsetW: number = Math.max(0, rawWidth - MAX_WIDTH);
        const offsetH: number = Math.max(0, rawHeight - MAX_HEIGHT);
        const halfOffsetW: number = Math.ceil(offsetW * 0.5);
        const halfOffsetH: number = Math.ceil(offsetH * 0.5);

        const data: Uint8Array = rt.readPixels();

        if (CC_JSB)
        {
            let filePath = jsb.fileUtils.getWritablePath() + fileName;
            let imgData = new Uint8Array(safeWidth * safeHeight * 4);
            // write the render data
            let rowBytes = (rawWidth - offsetW) * 4;
            for (let row = 0; row < safeHeight; row++)
            {
                let s_row = safeHeight - 1 - row + halfOffsetH;
                let start = s_row * rawWidth * 4 + halfOffsetW * 4;
                for (let i = 0; i < rowBytes; i++)
                {
                    imgData[row * rawWidth * 4 + i] = data[start + i];
                }
            }
            // @ts-ignore
            jsb.saveImageData(imgData, rawWidth, rawHeight, filePath);
        }
        else if (!CC_RUNTIME)
        {
            if (!this._canvas)
            {
                this._canvas = document.createElement('canvas');
            }
            else
            {
                this.clearCanvas();
            }

            this._canvas.width = safeWidth;
            this._canvas.height = safeHeight;

            let ctx = this._canvas.getContext('2d');
            // write the render data
            let rowBytes = (rawWidth - offsetW) * 4;
            for (let row = 0; row < safeHeight; row++)
            {
                let s_row = safeHeight - 1 - row + halfOffsetH;
                let imageData = ctx.createImageData(rawWidth - offsetW, 1);
                let start = s_row * rawWidth * 4 + halfOffsetW * 4;
                for (let i = 0; i < rowBytes; i++)
                {
                    imageData.data[i] = data[start + i];
                }

                ctx.putImageData(imageData, 0, row);
            }
        }

        let base64 = this._canvas.toDataURL("image/png"); // 压缩语句
        const tmp = document.createElement("a");
        tmp.style.display = 'none';
        tmp.href = base64;
        tmp.download = fileName;
        document.body.appendChild(tmp);
        tmp.click();
        document.body.removeChild(tmp);

        // const href = base64.replace(/^data:image[^;]*/, "data:image/octet-stream");
        // document.location.href = href;
        return base64;
    }

    public static clearCanvas(): void
    {
        if (!this._canvas)
        {
            return;
        }
        let ctx = this._canvas.getContext('2d');
        ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    }

    // 翻转图片像素Y轴数据，一般直接翻转节点
    private static _flipYImage(data: any[], width: number, height: number): Uint8Array
    {
        let picData = new Uint8Array(width * height * 4);
        let rowBytes = width * 4;
        for (let row = 0; row < height; ++row)
        {
            let realRow = height - 1 - row;
            let start = realRow * width * 4;
            let reStart = row * width * 4;
            for (let i = 0; i < rowBytes; ++i)
            {
                picData[reStart + i] = data[start + i];
            }
        }

        return picData;
    }

    // 对图片扩边
    private static _extensionImg(texture: cc.Texture2D, offset: number): cc.RenderTexture
    {
        const bWidth: number = texture.width + offset * 2;
        const bHeight: number = texture.height + offset * 2;
        const area: number = bHeight * bWidth * 4;
        const ret = new cc.RenderTexture();
        ret.initWithSize(bWidth, bHeight, cc.RenderTexture.DepthStencilFormat.RB_FMT_S8);
        ret.initWithData(new Uint8Array(area).fill(0), cc.Texture2D.PixelFormat.RGB888, bWidth, bHeight);
        ret.packable = false;
        // @ts-ignore
        ret.drawTextureAt(texture, offset, offset);

        return ret;
    }

    // 对 texture 扩边
    private static _extendTexture(data: any[], width: number, height: number): Uint8Array
    {
        // 四方向扩边 OFF_SET = 1
        const bWidth: number = width + 2 * OFF_SET;
        const bHeight: number = height + 2 * OFF_SET;

        const area: number = bWidth * bHeight * 4;
        const picData: Uint8Array = new Uint8Array(area);
        picData.fill(1, 0, area);

        let rowBytes: number = width * 4;
        for (let row = 0; row < height; ++row)
        {
            let realRow = height - 1 - row;
            let start = realRow * width * 4;
            let reStart = (row + OFF_SET) * bWidth * 4;
            for (let i = 0; i < rowBytes; ++i)
            {
                picData[reStart + i + 4 * OFF_SET] = data[start + i];
            }
        }

        return picData;
    }

    // 多层弹窗界面，可以重复利用一张截图，无需多次截图消耗性能 具体判断逻辑根据项目来 预留接口
    public static getRecycleShotTexture(): cc.Texture2D | null
    {
        let ret = null;
        // TODO find recycle shot texture
        return ret;
    }

    private static _getShotCameraNode(frameSize: cc.Size): cc.Node
    {
        let camera: cc.Camera;
        let node: cc.Node = cc.Canvas.instance.node.getChildByName("ScreenShotInstance");

        if (!cc.isValid(node))
        {
            node = new cc.Node("ScreenShotInstance");
            node.parent = cc.Canvas.instance.node;
            camera = node.addComponent(cc.Camera);
            camera.backgroundColor = cc.Color.TRANSPARENT;
            camera.clearFlags =
                cc.Camera.ClearFlags.DEPTH |
                cc.Camera.ClearFlags.STENCIL |
                cc.Camera.ClearFlags.COLOR;

            camera.cullingMask = 0xffffffff;
            camera.enabled = false;
        } else
        {
            camera = node.getComponent(cc.Camera);
        }
        camera.zoomRatio = cc.winSize.height / frameSize.height;
        return node;
    }

    // 排除忽略渲染对象及其子对象
    private static _cullNode(node: cc.Node, cullingMask: number): void
    {
        if (cc.isValid(node))
        {
            node["_cullingMask"] = cullingMask;
            if (node.childrenCount > 0)
            {
                node.children.forEach(child => this._cullNode(child, cullingMask));
            }
        }
    }
}

window['ScreenPostMgr'] = ScreenPostProcessing;
