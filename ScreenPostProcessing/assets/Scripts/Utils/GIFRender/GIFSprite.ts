import { GIFCache } from "./GIFParser";

const { ccclass, property, executeInEditMode } = cc._decorator;

@ccclass
@executeInEditMode
export default class GIFSprite extends cc.Component
{

    @property
    _path: string = "";

    @property
    public get path(): string
    {
        return this._path;
    }
    public set path(v: string)
    {
        this._path = v;
        if (v)
        {
            let isRemote = v.indexOf("http") > -1;
            isRemote ? this.loadUrl(v) : this.preload();
        }
    }

    public delays: number[] = [];
    public gifSp: cc.Sprite = null;
    public frames: cc.SpriteFrame[] = [];

    protected onLoad(): void
    {
        this._registerComps();
        if (this.path)
        {
            let isRemote = this.path.indexOf("http") > -1;
            isRemote ? this.loadUrl(this.path) : this.preload();
        }
    }

    private _registerComps(): void
    {
        this.gifSp = this.node.getComponent(cc.Sprite);
        if (!cc.isValid(this.gifSp))
        {
            this.gifSp = this.node.addComponent(cc.Sprite);
        }
    }

    public preload(): void
    {
        GIFCache.getInstance();
        cc.resources.load(this.path, (err, data: any) =>
        {
            // cc.log(err, data);
            if (err || !cc.isValid(this))
            {
                cc.error(err, '加载失败');
                return;
            }
            this.delays = data._nativeAsset.delays.map(v => v / 1e2);
            this.frames = data._nativeAsset.spriteFrames;
            this.play(true);
        });
    }

    public async loadUrl(url: string): Promise<any>
    {
        if (!url) return;
        GIFCache.getInstance();
        return new Promise<void>((res, rej) =>
        {
            this._path = url;
            cc.assetManager.loadAny({ url: url }, (err, data: any) =>
            {
                if (this.path !== url)
                {
                    cc.log("加载已过期，url: ", url);
                    const err = new Error(`加载已过期，url: ${url}`);
                    rej(err);
                    return;
                }
                // cc.log(err, data);
                if (err || !cc.isValid(this))
                {
                    rej(err);
                    return;
                }
                this.delays = data.delays.map(v => v / 1e2);
                this.frames = data.spriteFrames;
                this.play(true);
                res();
            });
        });
    }

    private _frameIdx: number = 0;
    public play(loop: boolean = false, playNext: boolean = false): void
    {
        if (!playNext)
        {
            this.stop();
        }
        if (this.frames.length)
        {
            if (this._frameIdx >= this.frames.length)
            {
                this._frameIdx = 0;
                if (!loop) return;
            }
            this.gifSp.spriteFrame = this.frames[this._frameIdx];
            this.scheduleOnce(() =>
            {
                this.play(loop, true);
            }, this.delays[this._frameIdx]);
            this._frameIdx++;
        }
    }

    public stop(): void
    {
        this._frameIdx = 0;
        this.unscheduleAllCallbacks();
    }

    public getCurrFrameIndex(): number
    {
        return this._frameIdx;
    }
}
