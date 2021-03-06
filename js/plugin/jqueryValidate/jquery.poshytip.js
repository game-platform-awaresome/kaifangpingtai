(function($) {

	var tips = [],
		reBgImage = /^url\(["']?([^"'\)]*)["']?\);?$/i,
		rePNG = /\.png$/i,
		ie6 = false;

	function handleWindowResize() {
		$.each(tips, function() {
			this.refresh(true);
		});
	}
	$(window).resize(handleWindowResize);

	$.Poshytip = function(elm, options) {
		this.$elm = $(elm);
		this.opts = $.extend({}, $.fn.poshytip.defaults, options);
		this.$tip = $(['<div class="', this.opts.className, '">',
			'<div class="tip-inner tip-bg-image"></div>',
			'<div class="tip-arrow tip-arrow-top tip-arrow-right tip-arrow-bottom tip-arrow-left"></div>',
			'<div class="tip-arrow tip-arrow-top1 tip-arrow-right1 tip-arrow-bottom1 tip-arrow-left1"></div>',
			'</div>'
		].join(''));
		this.$arrow = this.$tip.find('div.tip-arrow');
		this.$inner = this.$tip.find('div.tip-inner');
		this.disabled = false;
		this.init();
	};

	$.Poshytip.prototype = {
		init: function() {
			tips.push(this);

			this.$elm.data('title.poshytip', this.$elm.attr('title'))
				.data('poshytip', this);

			switch(this.opts.showOn) {
				case 'hover':
					this.$elm.bind({
						'mouseenter.poshytip': $.proxy(this.mouseenter, this),
						'mouseleave.poshytip': $.proxy(this.mouseleave, this)
					});
					if(this.opts.alignTo == 'cursor')
						this.$elm.bind('mousemove.poshytip', $.proxy(this.mousemove, this));
					if(this.opts.allowTipHover)
						this.$tip.hover($.proxy(this.clearTimeouts, this), $.proxy(this.hide, this));
					break;
				case 'focus':
					this.$elm.bind({
						'focus.poshytip': $.proxy(this.show, this),
						'blur.poshytip': $.proxy(this.hide, this)
					});
					break;
			}
		},
		mouseenter: function(e) {
			if(this.disabled)
				return true;

			this.clearTimeouts();
			this.$elm.attr('title', '');
			this.showTimeout = setTimeout($.proxy(this.show, this), this.opts.showTimeout);
		},
		mouseleave: function() {
			if(this.disabled)
				return true;

			this.clearTimeouts();
			this.$elm.attr('title', this.$elm.data('title.poshytip'));
			this.hideTimeout = setTimeout($.proxy(this.hide, this), this.opts.hideTimeout);
		},
		mousemove: function(e) {
			if(this.disabled)
				return true;

			this.eventX = e.pageX;
			this.eventY = e.pageY;
			if(this.opts.followCursor && this.$tip.data('active')) {
				this.calcPos();
				this.$tip.css({
					left: this.pos.l + 6,
					top: this.pos.t
				});
				if(this.pos.arrow)
					this.$arrow[0].className = 'tip-arrow tip-arrow-' + this.pos.arrow;
			}
		},
		show: function() {
			if(this.disabled || this.$tip.data('active'))
				return;

			this.reset();
			this.update();
			this.display();
		},
		hide: function() {
			if(this.disabled || !this.$tip.data('active'))
				return;

			this.display(true);
		},
		reset: function() {
			this.$tip.queue([]).detach().css('visibility', 'hidden').data('active', false);
			this.$inner.find('*').poshytip('hide');
			if(this.opts.fade)
				this.$tip.css('opacity', this.opacity);
			this.$arrow[0].className = 'tip-arrow tip-arrow-top tip-arrow-right tip-arrow-bottom tip-arrow-left';
		},
		update: function(content) {
			if(this.disabled)
				return;

			var async = content !== undefined;
			if(async) {
				if(!this.$tip.data('active'))
					return;
			} else {
				content = this.opts.content;
			}

			this.$inner.contents().detach();
			var self = this;
			this.$inner.append(
				typeof content == 'function' ?
				content.call(this.$elm[0], function(newContent) {
					self.update(newContent);
				}) :
				content == '[title]' ? this.$elm.data('title.poshytip') : content
			);

			this.refresh(async);
		},
		refresh: function(async) {
			if(this.disabled)
				return;

			if(async) {
				if(!this.$tip.data('active'))
					return;
				var currPos = {
					left: this.$tip.css('left'),
					top: this.$tip.css('top')
				};
			}

			this.$tip.css({
				left: 0,
				top: 0
			}).appendTo(document.body);

			if(this.opacity === undefined)
				this.opacity = this.$tip.css('opacity');

			var bgImage = this.$tip.css('background-image').match(reBgImage),
				arrow = this.$arrow.css('background-image').match(reBgImage);

			if(bgImage) {
				var bgImagePNG = rePNG.test(bgImage[1]);
				if(ie6 && bgImagePNG) {
					this.$tip.css('background-image', 'none');
					this.$inner.css({
						margin: 0,
						border: 0,
						padding: 0
					});
					bgImage = bgImagePNG = false;
				} else {
					this.$tip.prepend('<table border="0" cellpadding="0" cellspacing="0"><tr><td class="tip-top tip-bg-image" colspan="2"><span></span></td><td class="tip-right tip-bg-image" rowspan="2"><span></span></td></tr><tr><td class="tip-left tip-bg-image" rowspan="2"><span></span></td><td></td></tr><tr><td class="tip-bottom tip-bg-image" colspan="2"><span></span></td></tr></table>')
						.css({
							border: 0,
							padding: 0,
							'background-image': 'none',
							'background-color': 'transparent'
						})
						.find('.tip-bg-image').css('background-image', 'url("' + bgImage[1] + '")').end()
						.find('td').eq(3).append(this.$inner);
				}
				if(bgImagePNG && !$.support.opacity)
					this.opts.fade = false;
			}
			if(arrow && !$.support.opacity) {
				if(ie6 && rePNG.test(arrow[1])) {
					arrow = false;
					this.$arrow.css('background-image', 'none');
				}
				this.opts.fade = false;
			}

			var $table = this.$tip.find('table');
			if(ie6) {
				this.$tip[0].style.width = '';
				$table.width('auto').find('td').eq(3).width('auto');
				var tipW = this.$tip.width(),
					minW = parseInt(this.$tip.css('min-width')),
					maxW = parseInt(this.$tip.css('max-width'));
				if(!isNaN(minW) && tipW < minW)
					tipW = minW;
				else if(!isNaN(maxW) && tipW > maxW)
					tipW = maxW;
				this.$tip.add($table).width(tipW).eq(0).find('td').eq(3).width('100%');
			} else if($table[0]) {
				$table.width('auto').find('td').eq(3).width('auto').end().end().width(this.$tip.width()).find('td').eq(3).width('100%');
			}
			this.tipOuterW = this.$tip.outerWidth();
			this.tipOuterH = this.$tip.outerHeight();

			this.calcPos();

			if(arrow && this.pos.arrow) {
				this.$arrow[0].className = 'tip-arrow tip-arrow-' + this.pos.arrow;
				this.$arrow.css('visibility', 'inherit');
			}

			if(async)
				this.$tip.css(currPos).animate({
					left: this.pos.l + 6,
					top: this.pos.t
				}, 200);
			else
				this.$tip.css({
					left: this.pos.l + 6,
					top: this.pos.t
				});
		},
		display: function(hide) {
			var active = this.$tip.data('active');
			if(active && !hide || !active && hide)
				return;

			this.$tip.stop();
			if((this.opts.slide && this.pos.arrow || this.opts.fade) && (hide && this.opts.hideAniDuration || !hide && this.opts.showAniDuration)) {
				var from = {},
					to = {};
				if(this.opts.slide && this.pos.arrow) {
					var prop, arr;
					if(this.pos.arrow == 'bottom' || this.pos.arrow == 'top') {
						prop = 'top';
						arr = 'bottom';
					} else {
						prop = 'left';
						arr = 'right';
					}
					var val = parseInt(this.$tip.css(prop));
					from[prop] = val + (hide ? 0 : this.opts.slideOffset * (this.pos.arrow == arr ? -1 : 1));
					to[prop] = val + (hide ? this.opts.slideOffset * (this.pos.arrow == arr ? 1 : -1) : 0);
				}
				if(this.opts.fade) {
					from.opacity = hide ? this.$tip.css('opacity') : 0;
					to.opacity = hide ? 0 : this.opacity;
				}
				this.$tip.css(from).animate(to, this.opts[hide ? 'hideAniDuration' : 'showAniDuration']);
			}
			hide ? this.$tip.queue($.proxy(this.reset, this)) : this.$tip.css('visibility', 'inherit');
			this.$tip.data('active', !active);
		},
		disable: function() {
			this.reset();
			this.disabled = true;
		},
		enable: function() {
			this.disabled = false;
		},
		destroy: function() {
			this.reset();
			this.$tip.remove();
			this.$elm.unbind('poshytip').removeData('title.poshytip').removeData('poshytip');
			tips.splice($.inArray(this, tips), 1);
		},
		clearTimeouts: function() {
			if(this.showTimeout) {
				clearTimeout(this.showTimeout);
				this.showTimeout = 0;
			}
			if(this.hideTimeout) {
				clearTimeout(this.hideTimeout);
				this.hideTimeout = 0;
			}
		},
		calcPos: function() {
			var pos = {
					l: 0,
					t: 0,
					arrow: ''
				},
				$win = $(window),
				win = {
					l: $win.scrollLeft(),
//					t: $win.scrollTop(),
//					t: window.event.Y,
					t: $win.offsetTop,
					w: $win.width(),
					h: $win.height()
				},
				xL, xC, xR, yT, yC, yB;
			if(this.opts.alignTo == 'cursor') {
				xL = xC = xR = this.eventX;
				yT = yC = yB = this.eventY;
			} else {
				var elmOffset = this.$elm.offset(),
					elm = {
						l: elmOffset.left,
						t: elmOffset.top,
						w: this.$elm.outerWidth(),
						h: this.$elm.outerHeight()
					};
				xL = elm.l + (this.opts.alignX != 'inner-right' ? 0 : elm.w);
				xC = xL + Math.floor(elm.w / 2);
				xR = xL + (this.opts.alignX != 'inner-left' ? elm.w : 0);
				yT = elm.t + (this.opts.alignY != 'inner-bottom' ? 0 : elm.h);
				yC = yT + Math.floor(elm.h / 2);
				yB = yT + (this.opts.alignY != 'inner-top' ? elm.h : 0);
			}

			switch(this.opts.alignX) {
				case 'right':
				case 'inner-left':
					pos.l = xR + this.opts.offsetX;
					if(pos.l + this.tipOuterW > win.l + win.w)
						pos.l = win.l + win.w - this.tipOuterW;
					if(this.opts.alignX == 'right' || this.opts.alignY == 'center')
						pos.arrow = 'left';
					break;
				case 'center':
					pos.l = xC - Math.floor(this.tipOuterW / 2);
					if(pos.l + this.tipOuterW > win.l + win.w)
						pos.l = win.l + win.w - this.tipOuterW;
					else if(pos.l < win.l)
						pos.l = win.l;
					break;
				default:
					pos.l = xL - this.tipOuterW - this.opts.offsetX;
					if(pos.l < win.l)
						pos.l = win.l;
					if(this.opts.alignX == 'left' || this.opts.alignY == 'center')
						pos.arrow = 'right';
			}
			switch(this.opts.alignY) {
				case 'bottom':
				case 'inner-top':
					pos.t = yB + this.opts.offsetY;
					if(!pos.arrow || this.opts.alignTo == 'cursor')
						pos.arrow = 'top';
					if(pos.t + this.tipOuterH > win.t + win.h) {
						pos.t = yT - this.tipOuterH - this.opts.offsetY;
						if(pos.arrow == 'top')
							pos.arrow = 'bottom';
					}
					break;
				case 'center':
					pos.t = yC - Math.floor(this.tipOuterH / 2);
					if(pos.t + this.tipOuterH > win.t + win.h){
						pos.t = win.t + win.h - this.tipOuterH;
					}else if(pos.t < win.t){
						pos.t = win.t;
					}
					break;
				default:
					pos.t = yT - this.tipOuterH - this.opts.offsetY;
					if(!pos.arrow || this.opts.alignTo == 'cursor')
						pos.arrow = 'bottom';
					if(pos.t < win.t) {
						pos.t = yB + this.opts.offsetY;
						if(pos.arrow == 'bottom')
							pos.arrow = 'top';
					}
			}
			this.pos = pos;
		}
	};

	$.fn.poshytip = function(options) {
		if(typeof options == 'string') {
			return this.each(function() {
				var poshytip = $(this).data('poshytip');
				if(poshytip && poshytip[options])
					poshytip[options]();
			});
		}

		var opts = $.extend({}, $.fn.poshytip.defaults, options);

		if(!$('#poshytip-css-' + opts.className)[0])
			$(['<style id="poshytip-css-', opts.className, '" type="text/css">',
				'div.', opts.className, '{visibility:hidden;position:absolute;top:0;left:0;}',
				'div.', opts.className, ' table, div.', opts.className, ' td{margin:0;font-family:inherit;font-size:inherit;font-weight:inherit;font-style:inherit;font-variant:inherit;}',
				'div.', opts.className, ' td.tip-bg-image span{display:block;font:1px/1px sans-serif;height:', opts.bgImageFrameSize, 'px;width:', opts.bgImageFrameSize, 'px;overflow:hidden;}',
				'div.', opts.className, ' td.tip-right{background-position:100% 0;}',
				'div.', opts.className, ' td.tip-bottom{background-position:100% 100%;}',
				'div.', opts.className, ' td.tip-left{background-position:0 100%;}',
				'div.', opts.className, ' div.tip-inner{background-position:-', opts.bgImageFrameSize, 'px -', opts.bgImageFrameSize, 'px;}',
				'div.', opts.className, ' div.tip-arrow{visibility:hidden;position:absolute;overflow:hidden;font:1px/1px sans-serif;z-index:1001;}',
				'</style>'
			].join('')).appendTo('head');

		return this.each(function() {
			new $.Poshytip(this, opts);
		});
	}

	$.fn.poshytip.defaults = {
		content: '[title]',
		className: 'tip-yellow',
		bgImageFrameSize: 10,
		showTimeout: 500,
		hideTimeout: 100,
		showOn: 'hover',
		alignTo: 'cursor',
		alignX: 'right',
		alignY: 'top',
		offsetX: -22,
		offsetY: 18,
		allowTipHover: true,
		followCursor: false,
		fade: true,
		slide: true,
		slideOffset: 8,
		showAniDuration: 300,
		hideAniDuration: 300
	};

})(jQuery);