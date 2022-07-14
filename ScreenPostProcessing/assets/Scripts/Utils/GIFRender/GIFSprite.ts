import { FileType, GIFCache, GIFCacheItem } from "./GIFParser";

interface IClipInfo
{
    clip: cc.AnimationClip,
    url: string,
}

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
        let data: GIFCacheItem = GIFCache.getInstance().get(this.path);
        if (cc.isValid(data))
        {
            --data.referenceCount;
            if (data.referenceCount === 0)
            {
                GIFCache.getInstance().release(this.path);
            }
        }

        this._path = v;
        if (v)
        {
            let isRemote = v.indexOf("http") > -1;
            isRemote ? this.loadUrl(v) : this.preload();
        }
    }

    @property
    _useAnimationClip: boolean = false;
    @property
    public get useAnimationClip(): boolean
    {
        return this._useAnimationClip;
    }
    public set useAnimationClip(v: boolean)
    {
        this._useAnimationClip = v;
        if (!v)
        {
            this.stopAnimation();
        }
    }

    @property
    _speed: number = 1.0;
    @property({
        visible()
        {
            return this._useAnimationClip
        }
    })

    public get speed(): number
    {
        return this._speed;
    }
    public set speed(v: number)
    {
        this._speed = v;
        if (cc.isValid(this._animClipInfo.clip))
        {
            this._animClipInfo.clip.speed = v;
        }
    }

    public delays: number[] = [];
    public gifSp: cc.Sprite = null;
    public frames: cc.SpriteFrame[] = [];
    public gifAnim: cc.Animation = null;
    private _animClipInfo: IClipInfo = Object.create(null);

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
        if (this.useAnimationClip)
        {
            this.gifAnim = this.node.getComponent(cc.Animation);
            if (!cc.isValid(this.gifAnim))
            {
                this.gifAnim = this.node.addComponent(cc.Animation);
            }
        }

    }

    private preload(): void
    {
        let data: GIFCacheItem = GIFCache.getInstance().get(this.path);
        if (cc.isValid(data))
        {
            this.delays = data.frameData.delays;
            this.frames = data.frameData.spriteFrames;
            ++data.referenceCount;
            this.play(true);
        }
        else
        {
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
                GIFCache.getInstance().add(this.path, {
                    frameData: {
                        delays: this.delays.concat(),
                        spriteFrames: this.frames.concat(),
                        length: this.frames.length,
                    },
                    referenceCount: 1,
                    type: FileType.GIF,
                });
                this.play(true);
            });
        }
    }

    private async loadUrl(url: string): Promise<any>
    {
        if (!url) return;
        return new Promise<void>((res, rej) =>
        {
            let data: GIFCacheItem = GIFCache.getInstance().get(url);
            if (cc.isValid(data))
            {
                this.delays = data.frameData.delays;
                this.frames = data.frameData.spriteFrames;
                ++data.referenceCount;
                this.play(true);
                res();
            }
            else
            {
                cc.assetManager.loadAny({ url }, (err, data: any) =>
                {
                    if (!cc.isValid(this))
                    {
                        cc.log("脚本已销毁");
                        return;
                    }
                    if (err)
                    {
                        rej(err);
                        return;
                    }
                    if (this.path !== url)
                    {
                        cc.log("加载已过期，url: ", url);
                        const err = new Error(`加载已过期，url: ${url}`);
                        rej(err);
                        return;
                    }
                    this.delays = data.delays.map(v => v / 1e2);
                    this.frames = data.spriteFrames;
                    GIFCache.getInstance().add(this.path, {
                        frameData: {
                            delays: this.delays.concat(),
                            spriteFrames: this.frames.concat(),
                            length: this.frames.length,
                        },
                        referenceCount: 1,
                        type: FileType.GIF,
                    });
                    this.play(true);
                    res();
                });
            }
        });
    }

    private _frameIdx: number = 0;
    public play(loop: boolean = false, playNext: boolean = false): void
    {
        if (this.useAnimationClip)
        {
            this.playByAnimation(loop);
        }
        else 
        {
            this.playBySprite(loop, playNext);
        }
    }

    public playBySprite(loop: boolean = false, playNext: boolean = false): void
    {
        if (!playNext) this.stop();
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
                this.playBySprite(loop, true);
            }, this.delays[this._frameIdx]);
            this._frameIdx++;
        }
    }

    public playByAnimation(loop: boolean = false): void
    {
        if (!cc.isValid(this._animClipInfo.clip) || this._animClipInfo.url !== this.path)
        {
            this._animClipInfo.url = this.path;
            this._animClipInfo.clip = this.genAnimClipWithSpriteFrames(this.frames, this.delays);
        }
        const clip = this._animClipInfo.clip;
        clip.name = "gif_player";
        clip.wrapMode = loop ? cc.WrapMode.Loop : cc.WrapMode.Default;
        clip.speed = this._speed;
        for (let clip of this.gifAnim["_clips"])
        {
            if (cc.isValid(clip)) this.gifAnim.removeClip(clip, true);
        }
        this.gifAnim["_clips"].length = 0;
        this.gifAnim.addClip(clip);
        this.gifAnim.play("gif_player");
    }

    public stop(): void
    {
        this._frameIdx = 0;
        this.unscheduleAllCallbacks();
    }

    public stopAnimation(): void
    {
        if (cc.isValid(this.gifAnim))
        {
            this.gifAnim.stop();
        }
    }

    public getCurrFrameIndex(): number
    {
        if (this.useAnimationClip)
        {
            return 0;
        }
        else
        {
            return this._frameIdx;
        }
    }

    public genAnimClipWithSpriteFrames(spriteFrames: cc.SpriteFrame[], delays: number[], sample: number = 60): cc.AnimationClip
    {
        if (!Array.isArray(spriteFrames))
        {
            return null;
        }

        let clip = new cc.AnimationClip();
        clip.sample = sample || clip.sample;

        const totalDuration = delays.reduce((pre, ele) => pre += ele, 0);
        clip["_duration"] = totalDuration;

        let frames = [];
        let step = 1 / clip.sample;

        let frameSum: number = 0;
        for (let i = 0, l = spriteFrames.length; i < l; i++)
        {
            frames[i] = { frame: frameSum, value: spriteFrames[i] };
            frameSum += delays[i] ?? step;
        }
        // frames[spriteFrames.length] = { frame: frameSum, value: spriteFrames[0] };

        clip.curveData = {
            comps: {
                // component
                'cc.Sprite': {
                    // component properties
                    'spriteFrame': frames
                }
            }
        };

        return clip;
    }
}
