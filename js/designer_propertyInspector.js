if (!com)
	var com = {};
if (!com.logicpartners)
	com.logicpartners = {};
	
com.logicpartners.propertyInspector = function(designer, canvas) {
	this.canvas = canvas;
	this.canvasElement = $(canvas);
	this.labelDesigner = designer;
	// 激活元素
	this.activeElement = null;
	// 激活元素属性
	this.propertyNodes = {};
	// 最外曾的rect对象
	this.boundingBox = null;
	var self = this;

	// Create the property window.
	// 在标签设计画布后面添加属性框
	this.propertyInspector = $('<div></div>')
			.addClass("designerUtilityWindow")
			.css({
				"left": this.canvas.getBoundingClientRect().right + 5,
				"top": this.canvas.getBoundingClientRect().top
			})
			//.draggable({handle: "div.designerPropertyTitle"})
			.insertAfter(this.canvasElement);
			
	this.updatePosition = function(xchange) {
		this.propertyInspector.css("left", parseInt(this.propertyInspector.css("left")) + xchange);
		this.boundingBox = this.propertyInspector[0].getBoundingClientRect();
	}


	// 添加属性框试图,并且高度可拉伸 
	this.propertyViewContainer = $('<div></div>')
			.addClass("designerPropertyContainer")
			.resizable({
				resize: function(event, ui) {
					ui.size.width = ui.originalSize.width;
				}
			})
			.appendTo(this.propertyInspector);

	// 添加标题
	this.titleBar = $('<div>Property Inspector</div>')
			.addClass("designerPropertyTitle")
			.prependTo(this.propertyInspector)
			.on("dblclick", function() {
				self.propertyViewContainer.toggle();
			});

	// 添加属性内容
	this.propertyView = $('<div></div>')
			.addClass("designerPropertyContent")
			.appendTo(this.propertyViewContainer);

	// 更新
	this.update = function(activeElement) {
		var self = this;
		var getType = {};
		var keys = [];
		
		// 如果激活元素没变 将元素非只读元素赋值给试图
		if (this.activeElement == activeElement) {
			for (var key in activeElement) {
				if (!activeElement.readonly || key != "readonly" && $.inArray(key, activeElement.readonly) == -1) {
					if (getType.toString.call(activeElement[key]) != '[object Function]') {
						this.propertyNodes[key].val(activeElement[key]);
					}
				}
			}
		}
		else {
			this.activeElement = activeElement;
			this.propertyView.html('');

			for (var key in activeElement) {
				if (!keys[key]) {
					keys[key] = true;
					
					if (key != "readonly" && getType.toString.call(activeElement[key]) != '[object Function]') {
						var elementKey = $('<div>' + key + '</div>')
								.css({
									"width": "65px",
									"height": "20px",
									"border": "1px solid #AAAAAA",
									"float": "left",
									"font-size": "12px",
									"line-height": "20px",
									"border-right": "none",
									"text-align": "right",
									"padding-right": "5px",
									"margin-left": "5px"
								});

						var elementValue = $('<input type="text" name="' + key + '" value="' + activeElement[key] + '">')
								.css({
									"width": "120px",
									"float": "left",
									"height": "22px",
									"line-height": "20px",
									"padding-left": "5px"
								});
								
						if (!activeElement.readonly || $.inArray(key, activeElement.readonly) == -1) {
							elementValue.on("keyup", {"objectProperty": key}, function(event) {
								var data = self.activeElement[event.data.objectProperty];
								self.activeElement[event.data.objectProperty] = (data === parseInt(data, 10)) ? parseInt($(this).val()) : $(this).val();
								self.labelDesigner.updateCanvas();
							});
						}
						else {
							// Draw readonly textbox.
							elementValue.prop("readonly", true).css({ "background-color" : "#DDDDDD", border : "1px solid #AAAAAA" });
						}
					
						this.propertyNodes[key] = elementValue;

						var elementContainer = $('<div></div>')
								.css({
									"clear": "both",
									"padding-top": "2px"
								})
								.append(elementKey).append(elementValue);
						this.propertyView.append(elementContainer);
					}
				}
			}
		}
	}
	
	this.updatePosition(0);
}