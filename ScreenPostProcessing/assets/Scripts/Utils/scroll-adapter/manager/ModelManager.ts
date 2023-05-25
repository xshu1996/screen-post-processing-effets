// import { _decorator, Component, Node } from 'cc';
import { Manager } from '../abstract/Manager';
import { Layer, WrapMode } from '../define/enum';
import { IModel } from '../define/interface';
import { Helper } from '../help/helper';
const { ccclass, property } = cc._decorator;
enum Event {
    /** 当数据被清空时 */
    ON_CLEAR,
    /** 当添加数据时 */
    ON_INSERT,
    /** 当删除数据时 */
    ON_REMOVE,
    /** 当移动数据时 */
    ON_MOVE,
    /** 用户数据发生了改变 */
    ON_UPDATE,
    /** 当用户数据列表变化之前 */
    ON_CHANGE_BEFORE,
}
@ccclass('ModelManager')
export class ModelManager<T = any> extends Manager {
    public static Event = Event
    private readonly _modelList: IModel<T>[] = []
    private _length: number = 0
    public get length() { return this._length }
    public get modelList() { return this._modelList }
    protected onInit(): void {
    }
    public async insert(data: T | T[], insertIndex: number = this.length) {
        var list = this._toArray(data)
        insertIndex = Helper.clamp(insertIndex, 0, this.length)
        this.emit(Event.ON_CHANGE_BEFORE)
        this._insertHandler(list, insertIndex)
        this._length = this._modelList.length
        // console.log("插入完成", this._modelList)
        if (list.length > 0) {
            this.emit(Event.ON_INSERT, insertIndex)
        }
    }
    private _insertHandler(list: any[], insertIndex: number) {
        var index = insertIndex
        this._length = this._modelList.length
        var cacheList = []
        const newModel = (data: T, index: number) => {
            model = this._getNewModel(data)
            model.index = index
            this._modelList.push(model)
            return model
        }
        const action = (data: T) => {
            var model = this.get(index)
            if (model) {
                cacheList.push(this._copyModel(model, {}))
                model.data = data
                model.index = index
                this._initModel(model)
            } else {
                let curr = newModel(data, index)
                this._initModel(curr)
            }
            index++
        }
        for (let i = 0, len = list.length; i < len; i++) {
            action(list[i])
        }
        for (let i = 0; i < cacheList.length; i++) {
            const cache = cacheList[i];
            var idx = index + i
            if (this.get(idx)) {
                var model = this.get(idx)
                cacheList.push(this._copyModel(model, {}))
                this._copyModel(cache, model)
            } else {
                let curr = newModel(cache.data, idx)
                this._copyModel(cache, curr)
            }
        }
    }
    public remove(index: number, count: number = 1) {
        if (count == 0) return
        if (index < 0 || index >= this.length) return
        var removeIndex = this.length
        this.emit(Event.ON_CHANGE_BEFORE)
        for (let i = index; i < this.length; i++) {
            var model = this.get(i)
            var next = this.get(i + count)
            if (next) {
                this._copyModel(next, model)
                model.index = i
            } else {
                removeIndex = i
                break
            }
        }
        this._modelList.splice(removeIndex, this.length)
        this._length = this._modelList.length
        console.log(this._modelList)
        this.emit(Event.ON_REMOVE, index)
    }
    public move(startIndex: number, count: number, newIndex: number) {
        if (startIndex < 0 || count <= 0) return
        this.emit(Event.ON_CHANGE_BEFORE)
        var temp = this._modelList.map(item => this._copyModel(item, {}))
        var moveList = temp.splice(startIndex, count)
        temp.splice(newIndex, 0, ...moveList)
        for (let i = 0; i < temp.length; i++) {
            this._copyModel(temp[i], this._modelList[i])
        }
        var index = Math.min(startIndex, newIndex)
        this.emit(Event.ON_MOVE, index)
        console.log("移动后的数据", this._modelList)
    }
    /**
     * 更新所有数据
     */
    public update() {
        this.emit(Event.ON_UPDATE)
    }
    public clear() {
        this._modelList.length = 0
        this._length = 0
        this.emit(Event.ON_CLEAR)
    }
    public has(index: number): boolean {
        return !!this._modelList[index]
    }
    public get(index: number): IModel<T> | null {
        if (isNaN(index)) return null
        return this._modelList[index]
    }
    public slice(start: number, end: number) {
        if (this.length == 0) return []
        return this._modelList.slice(start, end)
    }
    private _toArray(data: T | T[]) {
        if (!data) return []
        if (data instanceof Array) {
            return data
        } else {
            return [data]
        }
    }
    private _getNewModel(data: T): IModel<T> {
        var model = {
            data: data,
            index: -1,
            code: null,
            size: { x: 0, y: 0 },
            layoutSize: { x: 0, y: 0 },
            scale: { x: 0, y: 0 },
            position: { x: 0, y: 0 },
            anchorPoint: { x: 0, y: 0 },
            element: {
                wrapBeforeMode: WrapMode.Wrap,
                wrapAfterMode: WrapMode.Nowrap,
                ignoreLayout: false,
                placeholder: false,
                minSize: { x: 0, y: 0 },
                preferredSize: { x: 0, y: 0 },
                flexibleSize: { x: 0, y: 0 },
                layer: Layer.Lowest,
                fixed: false,
                fixedOffset: 0,
                fixedSpacing: null,
                update: () => { }
            },
            isValid: true,
            update: () => { }
        }
        return model
    }
    private _initModel(model: IModel<T>): void {
        var prefab = this.adapter.getPrefab(model.data)
        if (!prefab) {
            throw Error("预制体不能为空")
        }
        var prefab = this.adapter.getPrefab(model.data)
        if (!prefab) {
            throw Error("预制体不能为空")
        }
        if (prefab instanceof cc.Node) {
            let transform = prefab
            model.code = prefab.uuid
            model.size = { x: transform.width, y: transform.height }
            model.scale = { x: transform.scaleX, y: transform.scaleY }
            model.anchorPoint = { x: transform.anchorX, y: transform.anchorY }
        } else {
            let transform = prefab.data
            model.code = prefab.data.uuid
            model.size = { x: transform.width, y: transform.height }
            model.scale = { x: transform.scaleX, y: transform.scaleY }
            model.anchorPoint = { x: transform.anchorX, y: transform.anchorY }
        }
        model.layoutSize = { x: 0, y: 0 }
        model.position = { x: 0, y: 0 }
        model.element = {
            wrapBeforeMode: WrapMode.Wrap,
            wrapAfterMode: WrapMode.Nowrap,
            ignoreLayout: false,
            placeholder: false,
            minSize: { x: 0, y: 0 },
            preferredSize: { x: 0, y: 0 },
            flexibleSize: { x: 0, y: 0 },
            layer: Layer.Lowest,
            fixed: false,
            fixedOffset: 0,
            fixedSpacing: null,
            update: () => { }
        }
        this.adapter.initElement(model.element, model.data)
    }
    private _copyModel(source: any, target: any) {
        source.element.update = () => { }
        const deep = (obj: any, cacheObj: any) => {
            for (const key in obj) {
                const value = obj[key]
                if (key == "data") {
                    cacheObj[key] = value
                    continue
                }
                if (key == "index") continue
                if (value != null && typeof value == "object") {
                    cacheObj[key] = {}
                    deep(value, cacheObj[key])
                } else {
                    cacheObj[key] = value
                }
            }
        }
        deep(source, target)
        return target
    }
}

