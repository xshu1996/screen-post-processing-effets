# screen-post-processing-effets

## static render 截图屏幕后处理效果

&emsp;&emsp;采用 摄像机截图（`getRenderTexture`) -> 应用高斯模糊（or other material）-> 截图( `reRenderNode` ) 生成 `texture` 应用到弹窗底图。<br>同时如果存在多个弹窗，可以补全 `getRecycleShotTexture` 函数判断是否存在可重复利用的 renderTexture ，从而减少摄像机截图带来的性能开销。

## real-time 截图模糊效果

&emsp;&emsp;每帧进行截图，并应用模糊 material ，打到实时模糊效果，开销比静态截图大，可以根据实际情况选择静态截图还是实时截图，同时也可以根据具体机型性能来调整截图的频率

## TODO

- 补全 `_cullNode` 函数的调用时机。
