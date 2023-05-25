const { ccclass, property, executeInEditMode, requireComponent, disallowMultiple, menu } = cc._decorator;

@ccclass
@executeInEditMode
@requireComponent(cc.RenderComponent)
@disallowMultiple
@menu("Utils/VertexGradient")
export default class VertexGradient extends cc.Component
{
    @property()
    private _vertexColors: cc.Color[] = [];
    @property({
        type: [cc.Color],
        tooltip: ` 顶点顺序
            2   3
            0   1
        `
    })
    public get vertexColors()
    {
        return this._vertexColors;
    }
    public set vertexColors(colors: cc.Color[])
    {
        this._vertexColors = colors;
        this._updateColors();
    }

    private _renderCmp: cc.RenderComponent | undefined = void 0;

    protected onLoad(): void
    {
        this._renderCmp = this.getComponent(cc.RenderComponent);
    }

    protected onEnable(): void
    {
        cc.director.once(cc.Director.EVENT_AFTER_DRAW, this._updateColors, this);
    }

    protected onDisable(): void
    {
        cc.director.off(cc.Director.EVENT_AFTER_DRAW, this._updateColors, this);
        this.node["_renderFlag"] |= cc["RenderFlow"].FLAG_COLOR;
    }

    private _updateColors(): void
    {
        if (!this._renderCmp)
        {
            return;
        }
        const assembler = this._renderCmp["_assembler"];
        if (!(assembler instanceof cc["Assembler2D"]))
        {
            return;
        }

        const uintVerts = assembler._renderData.uintVDatas[0];
        if (!uintVerts)
        {
            return;
        }
        const color = this.node.color;
        const floatsPerVert: number = assembler.floatsPerVert;
        const colorOffset: number = assembler.colorOffset;
        let count: number = 0;
        for (let i = colorOffset, l = uintVerts.length; i < l; i += floatsPerVert)
        {
            uintVerts[i] = (this.vertexColors[count++] || color)["_val"];
        }
    }
}
