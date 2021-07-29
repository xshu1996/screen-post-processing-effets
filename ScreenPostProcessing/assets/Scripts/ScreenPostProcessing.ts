/**
 * @author xshu
 * @version 0.0.1
 * @description 屏幕后处理 高斯模糊弹窗背景 流程： 截图->应用材质->截图
 */

const { ccclass, property } = cc._decorator;
const OFF_SET: number = 10;

interface IRenderParam {
    renderNode: cc.Node,
    frameSize: cc.Size,
    forceSnapShot?: boolean,
    isClear?: boolean,
}

@ccclass
class ScreenPostProcessing extends cc.Component {

    public static instance: ScreenPostProcessing = null;

    @property(cc.Material)
    public p_mtlBlurGauss: cc.Material = null;

    protected onLoad(): void {
        ScreenPostProcessing.instance = this;
    }

    public static getRenderTexture(renderParam: IRenderParam): cc.RenderTexture {
        let { renderNode, frameSize, forceSnapShot = false, isClear = false } = renderParam;
        const node: cc.Node = this._getShotCameraNode();
        const camera: cc.Camera = node.getComponent(cc.Camera);
        // 如果只考虑实时模糊效果，可以不用每次 new 一个 cc.RenderTexture 复用 camera 的 targetTexture 可优化效率
        let texture: cc.RenderTexture;
        if (!cc.isValid(camera.targetTexture) || forceSnapShot) {
            texture = new cc.RenderTexture();
            camera.targetTexture && delete camera.targetTexture['__targetRenderNode'];
            camera.targetTexture = texture;
        } else {
            texture = camera.targetTexture;
        }

        const worldPos = renderNode.convertToWorldSpaceAR(cc.Vec2.ZERO);
        const localPos = node.parent.convertToNodeSpaceAR(worldPos);
        node.setPosition(localPos);

        if (texture['__targetRenderNode'] !== renderNode ||
            frameSize.width !== texture.width ||
            frameSize.height !== texture.height) {
            // initWithSize 已经实现了 texture.packable = false;
            texture.initWithSize(frameSize.width, frameSize.height, cc.RenderTexture.DepthStencilFormat.RB_FMT_S8);
            camera._updateTargetTexture();
        }
        texture['__targetRenderNode'] = renderNode;
        camera.render(renderNode);
        if (isClear) camera.targetTexture = null;

        return texture;
    }

    // 生成截图节点
    public static getScreenShotNode(renderNode: cc.Node, createNew: boolean, recycleTexture?): cc.Node {
        let texture;
        if (!cc.isValid(recycleTexture)) {
            texture = this.getRenderTexture({
                renderNode,
                frameSize: cc.size(cc.visibleRect.width + OFF_SET, cc.visibleRect.height + OFF_SET),
                forceSnapShot: createNew
            });
        } else {
            texture = recycleTexture;
        }

        const ret = new cc.Node("ScreenShotBg");
        const sp = ret.addComponent(cc.Sprite);
        // 半透明图片颜色差异修复
        sp.srcBlendFactor = cc.macro.BlendFactor.ONE;
        // 某些特殊纯色底图会导致穿透
        sp.dstBlendFactor = cc.macro.BlendFactor.ONE_MINUS_DST_ALPHA;

        sp.setMaterial(0, this.instance.p_mtlBlurGauss);
        this.instance.p_mtlBlurGauss.setProperty("u_resolution", cc.v2(texture.width, texture.height));

        const spf = new cc.SpriteFrame();
        spf.setTexture(texture);
        sp.spriteFrame = spf;
        ret.scaleY = -1;

        return ret;
    }

    // 利用模糊材质处理后 二次截图 减少每帧材质运算的消耗, 需要在截图节点加入到节点树后进行
    public static reRenderNode(renderNode: cc.Node): cc.Node {
        if (!cc.isValid(renderNode)) return null;

        let texture: cc.RenderTexture = this.getRenderTexture({
            renderNode,
            frameSize: renderNode.getContentSize(),
            forceSnapShot: true,
            isClear: true,
        });
        let sp: cc.Sprite = renderNode.getComponent(cc.Sprite);
        // recover texture material
        sp.setMaterial(0, cc.Material.getBuiltinMaterial('2d-sprite'));
        sp.spriteFrame.setTexture(texture);
        sp._updateMaterial();
        renderNode.scaleY = -1;

        return renderNode;
    }

    // 翻转图片像素Y轴数据，一般直接翻转节点 scaleY = -1
    private static _flipYImage(data: any[], width: number, height: number): Uint8Array {
        let picData = new Uint8Array(width * height * 4);
        let rowBytes = width * 4;
        for (let row = 0; row < height; ++row) {
            let realRow = height - 1 - row;
            let start = realRow * width * 4;
            let reStart = row * width * 4;
            for (let i = 0; i < rowBytes; ++i) {
                picData[reStart + i] = data[start + i];
            }
        }

        return picData;
    }

    // 多层弹窗界面，可以重复利用一张截图，无需多次截图消耗性能 具体判断逻辑根据项目来 预留接口
    public static getRecycleShotTexture(): cc.Texture2D | null {
        let ret = null;
        // TODO find recycle shot texture
        return ret;
    }

    private static _getShotCameraNode(): cc.Node {
        let camera: cc.Camera;
        let node: cc.Node = cc.Canvas.instance.node.getChildByName("ScreenShotInstance");

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

        return node;
    }

    // 排除忽略渲染对象及其子对象
    private static _cullNode(node: cc.Node, cullingMask: number): void {
        if (cc.isValid(node)) {
            node["_cullingMask"] = cullingMask;
            if (node.childrenCount > 0) {
                node.children.forEach(child => this._cullNode(child, cullingMask));
            }
        }
    }
}
export = ScreenPostProcessing;
