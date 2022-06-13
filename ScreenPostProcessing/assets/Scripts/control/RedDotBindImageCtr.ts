import { EventNotify } from "../Utils/EventNotify";
import { RedDotModel } from "../models/RedDotModel";

/** 
 * 红点组合控制器， 可用于在同一个UI中，将多个红点图片与红点数据模型关联起来， 简化代码逻辑
 * UI 打开和关闭时，对此控制器进行开合，可实现一键操作所有红点事件
 * @author xshu
 */
export class RedDotBindImageController
{
    private _redDotModels: RedDotModel[] = [];
    private _redDotMapImg = new Map<string, cc.Node[]>();

    /** 将红点图片与红点数据模型关联起来， 节点(N 节点对应 1 红点模块)的显示，将自动与红点数据对应 */
    public bind(img: cc.Node, redDotModel: RedDotModel): RedDotModel
    {
        if (!redDotModel || !cc.isValid(img) || this._redDotMapImg.get(redDotModel.sn + "")) 
        {
            return redDotModel;
        }

        this._redDotModels.push(redDotModel);

        this._addImg2Map(img, redDotModel);

        img["$redDotVisible"] = img.active = redDotModel.isRedDot;
        redDotModel.on(EventNotify.RED_DOT_CHANGED, this.onChangeRedDot, this);

        return redDotModel;
    }

    /** 将节点添加到 Map 中映射起来 */
    private _addImg2Map(img: cc.Node, redDotModel: RedDotModel): void
    {
        let imgList: cc.Node[];
        if (!this._redDotMapImg.has(redDotModel.sn + ""))
        {
            imgList = [];
            this._redDotMapImg.set(redDotModel.sn + "", imgList);
        }
        imgList[imgList.length] = img;
    }

    /** 将红点图片与红点数据模型关联起来， 图片的显示，将自动与红点数据对应 */
    public bindList(img: cc.Node, ...redDotModels: RedDotModel[]): RedDotModel
    {
        const len: number = redDotModels.length;
        const tempModel = new RedDotModel(false);
        for (let i = 0; i < len; i++)
        {
            const el = redDotModels[i];
            if (el) 
            {
                tempModel.addChildModel(i, el);
            }
        }
        return this.bind(img, tempModel);
    }

    /** 红点状态变化回调 */
    private onChangeRedDot(redDotModel: RedDotModel): void
    {
        if (this._redDotMapImg.has(redDotModel.sn + ""))
        {
            const imgList = this._redDotMapImg.get(redDotModel.sn + "");
            imgList.forEach(img =>
            {
                img["$redDotVisible"] = img.active = redDotModel.isRedDot;
            });
        }
    }

    public cleanUp(): void
    {
        for (const model of this._redDotModels)
        {
            model.off(EventNotify.RED_DOT_CHANGED, this.onChangeRedDot, this);
            if (!model.isInstance) 
            {
                model.destroy(false);
            }
        }
        this._redDotModels.length = 0;

        const entries = this._redDotMapImg.entries();
        for (let entry = entries.next(); !entry.done; entry = entries.next()) 
        {
            const [key, value] = entry.value;
            value.length = 0;
            this._redDotMapImg.delete(key);
        }
        // "downlevelIteration": true
        // for (let [key, imgList] of this._redDotMapImg)
        // {
        //     imgList.length = 0;
        //     this._redDotMapImg.delete(key);
        // }
    }

    public getRedDotMapImg(sn: number)
    {
        if (!this._redDotMapImg) return null;
        return this._redDotMapImg.get(sn + "");
    }
}
