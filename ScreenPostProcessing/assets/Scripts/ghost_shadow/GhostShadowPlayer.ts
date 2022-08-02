import Shadow from "./Shadow";

interface IShadowData
{
    node: cc.Node,
    parent: cc.Node,
    shadowLife: number,
    life: number,
    curCd: number,
    cd: number,
    startOpacity: number,
    opacitySpeed: number,
    shadows?: Shadow[]
}

export default class GhostShadowPlayer extends cc.Component
{
    private static _instance: GhostShadowPlayer;
    private shadowData: { [uuid: string]: IShadowData };
    private _intervalID: number;
    private _shadowPool: Shadow[];
    private _prevTime: number;
    private _cameraNode: cc.Node;
    private _camera: cc.Camera;
    private CAMERA_ORTHO_SIZE_OFFSET: number = 200;//摄像机误差大小，出现裁剪问题设置这个

    public static get instance(): GhostShadowPlayer
    {
        if (!GhostShadowPlayer._instance)
        {
            GhostShadowPlayer._instance = new GhostShadowPlayer();
        }
        return GhostShadowPlayer._instance;
    }

    /**
     * 创建残影 
     * @param node 目标
     * @param life 多长时间后停止创建残影(s)
     * @param shadowLife 残影生命(s)
     * @param parent 残影父节点
     * @param startOpacity 残影开始不透明度
     * @param opacitySpeed 残影不透明度衰减速度
     * @param cd 创建残影间隔
    */
    public makeShadow(node: cc.Node, life: number, shadowLife: number, parent: cc.Node, startOpacity: number = 255, opacitySpeed: number = -255, cd: number = 0.1)
    {
        if (!cc.isValid(node) || !node.parent) return;
        if (!this.shadowData) this.shadowData = {};

        if (!this.shadowData[node.uuid])
        {
            this.shadowData[node.uuid] = {
                node, parent, life, shadowLife, cd, startOpacity, opacitySpeed,
                curCd: cd
            };
        }
        else
        {
            this.shadowData[node.uuid].parent = parent;
            this.shadowData[node.uuid].life = life;
            this.shadowData[node.uuid].shadowLife = shadowLife;
            this.shadowData[node.uuid].curCd = cd;
            this.shadowData[node.uuid].cd = cd;
            this.shadowData[node.uuid].startOpacity = startOpacity;
            this.shadowData[node.uuid].opacitySpeed = opacitySpeed;
        }

        this._initCamera();
        this._start();
        this._crateOneShadow(node.uuid);
    }

    private _initCamera()
    {
        if (!this.shadowData) return;
        let cameraParent = cc.Canvas.instance.node;
        if (!this._cameraNode)
        {
            this._cameraNode = new cc.Node;
            cameraParent.addChild(this._cameraNode);
        }
        if (!cc.isValid(this._camera))
        {
            this._camera = this._cameraNode.addComponent(cc.Camera);
            this._camera.depth = 0;
            this._camera.clearFlags = 0;
            this._camera.clearFlags = cc.Camera.ClearFlags.DEPTH | cc.Camera.ClearFlags.STENCIL;
            this._camera.alignWithScreen = false;
            this._camera.enabled = false;
        }
    }

    private _crateOneShadow(uuid: string)
    {
        if (!this.shadowData || !this.shadowData[uuid] || this.shadowData[uuid].life <= 0) return;

        let data = this.shadowData[uuid];
        let playerNode = this.shadowData[uuid].node;
        data.shadows || (data.shadows = []);
        const shadow: Shadow = this._shadowPool?.pop() ?? new Shadow();
        shadow.init(data.shadowLife, data.startOpacity, data.opacitySpeed);

        const playerSize: cc.Size = cc.size(
            playerNode.width * playerNode.scaleX,
            playerNode.height * playerNode.scaleY
        );
        let centerPos = cc.v2(
            playerSize.width * 0.5 - playerSize.width * playerNode.anchorX,
            playerSize.height * 0.5 - playerSize.height * playerNode.anchorY
        );
        const worldPos: cc.Vec2 = playerNode.convertToWorldSpaceAR(centerPos);
        const localPos: cc.Vec2 = data.parent.convertToNodeSpaceAR(worldPos);
        shadow.setPosition(localPos);

        const cameraOrthoSize: number = Math.max(
            Math.abs(playerNode.width),
            Math.abs(playerNode.height)
        ) * 0.5 + this.CAMERA_ORTHO_SIZE_OFFSET;
        shadow.renderTexture.initWithSize(cameraOrthoSize * 2, cameraOrthoSize * 2);
        centerPos = this._cameraNode.parent.convertToNodeSpaceAR(worldPos);
        this._cameraNode.setPosition(centerPos.x, centerPos.y);

        this._camera.cullingMask = 0x00000000;
        this._camera.cullingMask |= playerNode['_cullingMask'];
        this._camera.orthoSize = cameraOrthoSize;
        this._camera.enabled = true;
        this._camera.targetTexture = shadow.renderTexture;
        this._camera.render(playerNode);
        this._camera.enabled = false;

        if (shadow.parent != data.parent) shadow.parent = data.parent;
        if (!data.shadows.includes(shadow)) data.shadows.push(shadow);
    }

    private _realRecoverOneShadow(uuid: string, shadow: Shadow)
    {
        const shadows = this.shadowData[uuid].shadows;
        shadow.recover();
        if (shadows.includes(shadow))
        {
            shadows.splice(shadows.indexOf(shadow), 1);
        }
        else
        {
            cc.error("error _realRecoverOneShadow shadows.includes(shadow)")
        }
        if (!this._shadowPool) this._shadowPool = [];
        if (!this._shadowPool.includes(shadow))
        {
            this._shadowPool.push(shadow);
        }
        else
        {
            cc.error("repeat recover shadow");
        }
    }

    private _recoverOneShadow(uuid: string, shadow?: Shadow)
    {
        const length: number = this.shadowData?.[uuid]?.shadows?.length ?? 0;
        if (length <= 0) return;

        if (shadow)
        {
            this._realRecoverOneShadow(uuid, shadow);
        }
        else
        {
            let uuid2Shadows = this.shadowData[uuid].shadows;
            for (let i = uuid2Shadows.length - 1; i >= 0; i--)
            {
                this._realRecoverOneShadow(uuid, uuid2Shadows[i]);
            }
        }
    }

    public recoverAllShadow(): void
    {
        if (!this.shadowData) return;
        for (let uuid in this.shadowData)
        {
            this._recoverOneShadow(uuid);
        }
        this._allStop();
    }

    // public destroyAllShadow() {
    //     this.shadowData = null;
    //      this._allStop();
    // }

    private _start(): void
    {
        if (!this._intervalID)
        {
            this._prevTime = Date.now();
            this._intervalID = setInterval(this._loop.bind(this), 1 / 60);
        }
    }

    private _allStop(): void
    {
        if (this._intervalID) clearInterval(this._intervalID);
        this._intervalID = null;
        if (this._camera) this._camera.enabled = false;
        this.shadowData = null;
    }

    private _isAllComplete()
    {
        if (!this.shadowData) return true;

        for (const k in this.shadowData)
        {
            if (this.shadowData[k].life > 0) return false;
            const shadows = this.shadowData[k].shadows;
            for (let i = 0; shadows && i < shadows.length; i++)
            {
                if (!shadows[i].isOver) return false;
            }
        }
        return true;
    }

    private _loop(): void
    {
        if (this._isAllComplete())
        {
            this._allStop();
            return;
        }
        let dt: number = Math.floor(((Date.now() - this._prevTime) / 1000) * 10000) / 10000;
        const dataMap = this.shadowData;
        for (const uuid in dataMap)
        {
            let data = dataMap[uuid];
            if (data.life > 0) data.life -= dt;
            if (data.curCd > 0 && data.life > 0)
            {
                data.curCd -= dt;
                if (data.curCd <= 0)
                {
                    data.curCd = data.cd;
                    this._crateOneShadow(uuid);
                }
            }
            let shadows = data.shadows;
            for (let i = 0; shadows && i < shadows.length; i++)
            {
                shadows[i].update(dt);
                if (shadows[i].isOver)
                {
                    this._recoverOneShadow(uuid, shadows[i]);
                    i--;
                }
            }
        }
        this._prevTime = Date.now();
    }
}
