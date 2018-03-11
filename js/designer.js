if (!com)
	var com = {};
if (!com.logicpartners)
	com.logicpartners = {};

// http://stackoverflow.com/a/5932203/697477
/**
 * 获取在canvas上触发时间时的鼠标相对与canvas本身的x,y坐标值
 * @param {*} event 
 */
HTMLCanvasElement.prototype.RelativeMouse = function (event) {
	var totalOffsetX = 0;
	var totalOffsetY = 0;
	var canvasX = 0;
	var canvasY = 0;
	var currentElement = this;

	do {
		totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
		totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
	}
	while (currentElement = currentElement.offsetParent)

	canvasX = event.clientX - totalOffsetX;
	canvasY = event.clientY - totalOffsetY;

	console.log({ x: canvasX, y: canvasY })
	return { x: canvasX, y: canvasY }
}

// From http://stackoverflow.com/a/4577326/697477
/**
 * 实现canvas画虚线的方法 
 */
var CP = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
if (CP && CP.lineTo) {
	CP.dashedLine = function (x, y, x2, y2, dashArray) {
		if (!dashArray)
			dashArray = [10, 5];
		if (dashLength == 0)
			dashLength = 0.001; // Hack for Safari
		var dashCount = dashArray.length;
		this.moveTo(x, y);
		var dx = (x2 - x), dy = (y2 - y);
		var slope = dx ? dy / dx : 1e15;
		var distRemaining = Math.sqrt(dx * dx + dy * dy);
		var dashIndex = 0, draw = true;
		while (distRemaining >= 0.1) {
			var dashLength = dashArray[dashIndex++ % dashCount];
			if (dashLength > distRemaining)
				dashLength = distRemaining;
			var xStep = Math.sqrt(dashLength * dashLength / (1 + slope * slope));
			if (dx < 0)
				xStep = -xStep;
			x += xStep
			y += slope * xStep;
			this[draw ? 'lineTo' : 'moveTo'](x, y);
			distRemaining -= dashLength;
			draw = !draw;
		}

		// Ensure that the last segment is closed for proper stroking
		this.moveTo(0, 0);
	}

	/**
	 * 画虚线四边形
	 * @param {*} x 
	 * @param {*} y 
	 * @param {*} x2 
	 * @param {*} y2 
	 * @param {*} dashArray 
	 */
	CP.dashedStroke = function (x, y, x2, y2, dashArray) {
		this.beginPath();
		this.dashedLine(x, y, x2, y, dashArray);
		this.dashedLine(x2, y, x2, y2, dashArray);
		this.dashedLine(x2, y2, x, y2, dashArray);
		this.dashedLine(x, y, x, y2, dashArray);
		this.stroke();
	}
}


/**
 * 标签设计部分 单位是 英寸
 * @param {* 画布id} canvasid 
 * @param {* 标签宽度} labelWidth 
 * @param {* 标签高度} labelHeight
 */
com.logicpartners.labelDesigner = function (canvasid, labelWidth, labelHeight) {
	// labelWidth = labelWidth /25.4;  // 将mm换算成英寸
	// labelHeight = labelHeight /25.4;  // 将mm换算成英寸

	// 获取canvas
	this.canvas = document.getElementById(canvasid);
	this.canvasElement = $(this.canvas);
	// 标签宽高根据dpi转换成px像素 这个时候dpi还没赋值，所以算出来是NaN
	this.labelWidth = labelWidth * this.dpi;
	this.labelHeight = labelHeight * this.dpi;

	// 右边属性栏
	this.propertyInspector = new com.logicpartners.propertyInspector(this, this.canvas);
	// 左边工具栏
	this.toolbar = new com.logicpartners.toolsWindow(this, this.canvas);
	// 上边标签属性栏
	this.labelInspector = new com.logicpartners.labelInspector(this, this.canvas);
	// 设置dpi
	this.dpi = 200;

	// 获取二维渲染上下文
	this.drawingContext = this.canvas.getContext("2d");

	// 画布种元素集合
	this.elements = [];

	// 当前画布层数
	this.currentLayer = 0;

	// 当前控制的元素，相应的右边的属性栏显示的也是当前元素的属性
	this.activeElement = null;

	// 工具栏？
	this.activeTool = null;

	// x边距 y边距
	this.labelX = this.canvas.width / 2 - this.labelWidth / 2;
	this.labelY = 5;

	this.newObject = null;

	// 记录拖住啊起始点
	this.dragStartPosition = { x: 0, y: 0 };
	// 记录拖住开始时间
	this.dragStartTime = 0;
	// 记录拖拽最后的位置
	this.dragLastPosition = { x: 0, y: 0 };
	// 记录拖拽元素的偏移量
	this.dragElementOffset = { x: 0, y: 0 };
	// 拖拽动做
	this.dragAction = 0;
	// 正在拖拽与否的判断值
	this.dragging = false;

	var self = this;

	/**
	 * 更新标签尺寸
	 * @param {*宽度} width 英寸 
	 * @param {*高度} height 英寸
	 */
	this.updateLabelSize = function (width, height) {
		// 求得宽度改变值
		var xchange = (width * this.dpi + 10) - parseInt(this.canvasElement.prop("width"));
		this.labelWidth = width * this.dpi;
		this.labelHeight = height * this.dpi;
		// 修改宽度与高度
		this.canvasElement.prop("width", this.labelWidth + 10).prop("height", this.labelHeight + 10);

		this.labelX = this.canvas.width / 2 - this.labelWidth / 2;
		this.labelY = 5;
		console.log(xchange);
		// 更新右边属性栏的位置
		this.propertyInspector.updatePosition(xchange);
		// 更新上边标签属性栏的位子
		this.labelInspector.updatePosition(xchange);

		// 更新Canvas
		this.updateCanvas();
	}

	/**
	 * 注册点击事件
	 */
	this.canvasElement.on("click", function () {
		// 设置激活的元素
		self.setActiveElement();
	})
	// 
		.on("mousedown", function () {
			self.dragStartPosition = self.canvas.RelativeMouse(event);
			self.dragLastPosition = self.dragStartPosition;

			// 判断是否添加元素
			if (self.newObject) {
				// Create new object.
				self.elements[self.currentLayer++] = new self.newObject(self.dragStartPosition.x, self.dragStartPosition.y, 1, 1);
				// 拖拽动作为8？
				self.dragAction = 8;
				// 如果是添加新的元素，添加完后左边的添加栏的样式需改变
				self.activeElement = self.elements[self.currentLayer - 1];
				self.newObjectController.button.removeClass("designerToolbarButtonActive");
				self.newObject = null;
				self.newObjectController = null;
			}
			else {
				// 拖拽工作重置为0
				self.dragAction = 0;
				// 设置激活元素
				self.setActiveElement();

				if (self.activeElement) {
					self.dragElementOffset = {
						x: self.activeElement.x - self.dragStartPosition.x,
						y: self.activeElement.y - self.dragStartPosition.y
					};

					self.setActiveHandle(self.dragStartPosition);
				}
			}
			self.dragging = true;
		})
		.on("mouseup", function () {
			self.dragging = false;
		})
		.on("mouseout", function () {
			self.dragging = false;
		})
		.on("mousemove", function () {
			if (self.dragging && self.activeElement) {
				var coords = self.canvas.RelativeMouse(event);
				//console.log(self.dragAction);
				switch (self.dragAction) {
					case 0:
						self.move(coords.x + self.dragElementOffset.x, coords.y + self.dragElementOffset.y);
						break;
					default:
						self.resize(coords.x - self.dragLastPosition.x, coords.y - self.dragLastPosition.y, self.dragAction);
						break;
				}
				self.updateCanvas();
				self.dragLastPosition = coords;
			}
			else if (self.newObject != null) {
				self.canvasElement.css({ cursor: "crosshair" });
			}
			else if (self.activeElement) {
				var coords = self.canvas.RelativeMouse(event);
				// If cursor is within range of edge, show resize handles
				var location = self.getHandle(coords);
				var style = "default";
				switch (location) {
					case 0:
						style = "default";
						break;
					case 1:
						style = "nw-resize";
						break;
					case 2:
						style = "n-resize";
						break;
					case 3:
						style = "ne-resize";
						break;
					case 4:
						style = "w-resize";
						break;
					case 5:
						style = "e-resize";
						break;
					case 6:
						style = "sw-resize";
						break;
					case 7:
						style = "s-resize";
						break;
					case 8:
						style = "se-resize";
						break;
				}
				self.canvasElement.css({ cursor: style });
			}
		})
		.on("keydown", function (event) {
			event = event || window.event;

			var handled = false;
			switch (event.keyCode) {
				case 37: // Left arrow
					if (self.activeElement)
						self.activeElement.x -= 1;
					handled = true;
					break;
				case 38: // Up arrow
					if (self.activeElement)
						self.activeElement.y -= 1;
					handled = true;
					break;
				case 39: // Right arrow
					if (self.activeElement)
						self.activeElement.x += 1;
					handled = true;
					break;
				case 40: // Down arrow
					if (self.activeElement)
						self.activeElement.y += 1;
					handled = true;
					break;
				case 46:
					if (self.activeElement) {
						self.deleteActiveElement();
						handled = true;
					}
					break;
				case 80:
					if (event.ctrlKey) {
						self.generateZPL();
						handled = true;
					}
					break;
			}

			if (handled) {
				self.updateCanvas();
				event.preventDefault();
				event.stopPropagation();
			}
		});

	// 添加子元素
	this.addObject = function (object) {
		this.elements[this.currentLayer++] = object;
		this.activeElement = this.elements[this.currentLayer - 1];
		this.updateCanvas();
	}

	// 删除激活元素
	this.deleteActiveElement = function () {
		if (this.activeElement) {
			for (var i = 0; i < this.currentLayer; i++) {
				if (this.elements[i] && this.elements[i] == this.activeElement) {
					this.elements[i] = null;
					this.activeElement = null;
				}
			}
		}
	}

	// 设置激活元素
	this.setActiveElement = function () {
		var coordinates = this.canvas.RelativeMouse(event);
		if (!this.activeElement || this.getHandle(coordinates) == 0) {
			this.activeElement = null;
			for (var i = this.currentLayer - 1; i >= 0; i--) {
				if (this.elements[i] && this.elements[i].hitTest(coordinates)) {
					this.activeElement = this.elements[i];
					break;
				}
			}
		}

		this.updateCanvas();
	}

	/**
	 * Parameters: Coordinates on canvas.
	 * 
	 * Returns: 0 if not on resize zone.
	 *          1 top left     2 top     3 top right
	 *          4 left                   5 right
	 *          6 bottom left  7 bottom  8 bottom right
	 */
	this.setActiveHandle = function (coords) {
		this.dragAction = this.getHandle(coords);
	}

	this.getHandle = function (coords) {
		var result = 0;

		var leftEdge = coords.x > this.activeElement.x - 5 && coords.x < this.activeElement.x + 5;
		var rightEdge = coords.x > this.activeElement.x + this.activeElement.getWidth() - 5 && coords.x < this.activeElement.x + this.activeElement.getWidth() + 5;
		var topEdge = coords.y > this.activeElement.y - 5 && coords.y < this.activeElement.y + 5;
		var bottomEdge = coords.y > this.activeElement.y + this.activeElement.getHeight() - 5 && coords.y < this.activeElement.y + this.activeElement.getHeight() + 5;

		// 垂直击中
		var verticalHit = coords.y > this.activeElement.y && coords.y < this.activeElement.y + this.activeElement.getHeight();
		// 水平击中
		var horizontalHit = coords.x > this.activeElement.x && coords.x < this.activeElement.x + this.activeElement.getWidth();

		if (leftEdge && topEdge)
			result = 1;
		else if (rightEdge && topEdge)
			result = 3;
		else if (leftEdge && bottomEdge)
			result = 6;
		else if (rightEdge && bottomEdge)
			result = 8;
		else if (topEdge && horizontalHit)
			result = 2;
		else if (leftEdge && verticalHit)
			result = 4;
		else if (rightEdge && verticalHit)
			result = 5;
		else if (bottomEdge && horizontalHit)
			result = 7;

		return result;
	}

	// 移动激活元素
	this.move = function (x, y) {
		this.activeElement.x = x;
		this.activeElement.y = y;
	}

	// 调整激活元素的大小
	this.resize = function (xchange, ychange) {
		switch (this.dragAction) {
			case 1: // Top Left
				this.activeElement.x += xchange;
				this.activeElement.y += ychange;
				this.activeElement.setWidth(this.activeElement.getWidth() - xchange);
				this.activeElement.setHeight(this.activeElement.getHeight() - ychange);
				break;
			case 2: // Top
				this.activeElement.y += ychange;
				this.activeElement.setHeight(this.activeElement.getHeight() - ychange);
				break;
			case 3: // Top Right
				this.activeElement.setWidth(this.activeElement.getWidth() + xchange);
				this.activeElement.y += ychange;
				this.activeElement.setHeight(this.activeElement.getHeight() - ychange);
				break;
			case 4: // Left
				this.activeElement.x += xchange;
				this.activeElement.setWidth(this.activeElement.getWidth() - xchange);
				break;
			case 5: // Right
				this.activeElement.setWidth(this.activeElement.getWidth() + xchange);
				break;
			case 6: // Bottom Left
				this.activeElement.x += xchange;
				this.activeElement.setWidth(this.activeElement.getWidth() - xchange);
				this.activeElement.setHeight(this.activeElement.getHeight() + ychange);
				break;
			case 7: // Bottom
				this.activeElement.setHeight(this.activeElement.getHeight() + ychange);
				break;
			case 8: // Bottom Right
				this.activeElement.setWidth(this.activeElement.getWidth() + xchange);
				this.activeElement.setHeight(this.activeElement.getHeight() + ychange);
				break;
		}

		if (this.activeElement.getWidth() == 0) {
			this.activeElement.setWidth(-1);
			this.activeElement.x += 1;
		}

		if (this.activeElement.getHeight() == 0) {
			this.activeElement.setHeight(-1);
			this.activeElement.y += 1;
		}

		if (this.activeElement.width < 0) {
			this.activeElement.x = this.activeElement.x + this.activeElement.getWidth();
			this.activeElement.setWidth(parseInt(this.activeElement.getWidth() * -1));
			this.swapActionHorizontal();
		}

		if (this.activeElement.height < 0) {
			this.activeElement.y = this.activeElement.y + this.activeElement.getHeight();
			this.activeElement.setHeight(this.activeElement.getHeight() * -1);
			this.swapActionVertical();
		}
	}

	// 垂直方向
	this.swapActionVertical = function () {
		switch (this.dragAction) {
			case 1:
				this.dragAction = 6;
				break;
			case 2:
				this.dragAction = 7;
				break;
			case 3:
				this.dragAction = 8;
				break;
			case 6:
				this.dragAction = 1;
				break;
			case 7:
				this.dragAction = 2;
				break;
			case 8:
				this.dragAction = 3;
				break;
		}
	}

	// 水平方向
	this.swapActionHorizontal = function () {
		switch (this.dragAction) {
			case 1:
				this.dragAction = 3;
				break;
			case 3:
				this.dragAction = 1;
				break;
			case 4:
				this.dragAction = 5;
				break;
			case 5:
				this.dragAction = 4;
				break;
			case 6:
				this.dragAction = 8;
				break;
			case 8:
				this.dragAction = 6;
				break;
		}
	}

	// 右边激活元素的属性框的更新
	this.update = function () {
		this.propertyInspector.update(this.activeElement);
	}

	this.updateCanvas = function () {
		this.update();

		//this.drawingContext.globalCompositeOperation = "source-over";

		// 画白色实心长方形
		this.drawingContext.fillStyle = "#FFFFFF";
		this.drawingContext.fillRect(0, 0, this.canvas.width, this.canvas.height);

		//this.drawingContext.fillStyle = "rgba(255, 255, 255, 0)";
		//this.drawingContext.fillRect(0, 0, this.canvas.width, this.canvas.height);

		// Draw the boundary.
		// 用红色线画长方形(边界)
		this.drawingContext.strokeStyle = "#FF0000";
		this.drawingContext.lineWidth = 2;
		this.drawingContext.strokeRect(this.labelX, this.labelY, this.labelWidth, this.labelHeight);

		this.drawingContext.strokeStyle = "#000000";
		this.drawingContext.fillStyle = "#000000";

		//this.drawingContext.globalCompositeOperation = "difference";

		for (var i = 0; i < this.currentLayer; i++) {
			if (this.elements[i]) {
				this.elements[i].draw(this.drawingContext, this.canvas.width, this.canvas.height);
			}
		}

		this.drawingContext.strokeStyle = "#FF0000";
		this.drawingContext.lineCap = 'butt';
		this.drawingContext.lineWidth = 2;
		if (this.activeElement)
			this.activeElement.drawActive(this.drawingContext);
	}

	// 生成zpl
	this.generateZPL = function () {
		var data = "^XA\r\n" +
			"^CFd0,10,18\r\n" +
			"^PR12\r\n" +
			"^LRY\r\n" +
			"^MD30\r\n" +
			"^PW" + this.labelWidth + "\r\n" +
			"^LL" + this.labelHeight + "\r\n" +
			"^PON\r\n";
		var bufferData = "";

		for (var i = 0; i < this.currentLayer; i++) {
			if (this.elements[i]) {
				bufferData += this.elements[i].getZPLData();
				data += this.elements[i].toZPL(this.labelX, this.labelY, this.labelHeight, this.labelWidth);
			}
		}

		data += "^PQ1\r\n" +
			"^XZ\r\n";
		console.log(bufferData + data);
		return { "data": bufferData, "zpl": data };
	}

	this.setNewObject = function (controller) {
		if (controller) {
			this.newObject = controller.object;
			this.newObjectController = controller;
		}
		else {
			this.newObject = null;
			this.newObjectController = null;
		}
	}

	this.addRectangle = function (x, y, width, height) {
		this.elements[this.currentLayer++] = new this.Rectangle(x, y, width, height);
		this.updateCanvas();
	}

	this.updateLabelSize(labelWidth, labelHeight);

	this.updateCanvas();
}