import { Canvas } from './canvas';
import { Block } from './block';

export class Engine {
    document: Document = document;
    canvas: Canvas;
    spacingX: number;
    spacingY: number;

    public onGrab: (grabbedNode: HTMLElement) => void;
    public onRelease: () => void;
    public onSnap: (node: HTMLElement, val: boolean, block: Block) => void;

    public import: ({ html, blockarr }) => void;
    public output: () => void;
    public deleteBlocks: () => void;

    constructor(
        container: HTMLElement,
        spacingX?: number,
        spacingY?: number,
        onGrab?: (grabbedNode: HTMLElement) => void,
        onRelease?: () => void,
        onSnap?: (node: HTMLElement, val: boolean, block: Block) => void) {
        this.onGrab = onGrab;
        this.onRelease = onRelease;
        this.onSnap = onSnap;

        this.canvas = new Canvas({ node: container, spacingX, spacingY, window, document });
        this.canvas.initialize();
        this.canvas.setState({
            currentOffsetLeft: 0,
            previousOffsetLeft: 0
        });

        this.import = this.canvas.import;
        this.output = this.canvas.output;
        this.deleteBlocks = this.canvas.reset;

        document.addEventListener('mousedown', this.beginDrag.bind(this));
        document.addEventListener('touchstart', this.beginDrag.bind(this));

        document.addEventListener('mousedown', this.touchblock.bind(this), false);
        document.addEventListener('touchstart', this.touchblock.bind(this), false);
        document.addEventListener('mouseup', this.touchblock.bind(this), false);

        document.addEventListener('mouseup', this.endDrag.bind(this), false);
        document.addEventListener('touchend', this.endDrag.bind(this), false);

        document.addEventListener('mousemove', this.moveBlock.bind(this), false);
        document.addEventListener('touchmove', this.moveBlock.bind(this), false);
    }


    handleCoordinates(event: any) {
        const { clientX, clientY } = event.targetTouches ? event.targetTouches[0] : event;
        return this.canvas.setState({
            mouseX: clientX,
            mouseY: clientY
        });
    }

    beginDrag(event) {
        this.handleCoordinates(event);

        const { target, which } = event;
        const grabbedNode = target.closest('.create-flowy');

        if (which === 3 || !grabbedNode) {
            if (event.target.className === 'canvas') {
                this.canvas.toggleDraggingCanvas(true);
            } else {
                return;
            }
        } else  {
            this.canvas.grab(grabbedNode);
            this.canvas.toggleDragging(true);
            this.onGrab(grabbedNode);
        }
    }

    touchDone = () => {
        this.canvas.toggleDraggingBlock(false);
    }

    touchblock(event) {
        this.canvas.toggleDraggingBlock(false);

        if (!this.hasParentClass(event.target, 'block')) {
            return;
        }

        const theblock = event.target.closest('.block');

        const { mouseX, mouseY } = this.handleCoordinates(event);

        if (
            event.type !== 'mouseup' &&
            this.hasParentClass(event.target, 'block') &&
            event.which !== 3 &&
            !this.canvas.isDragging &&
            !this.canvas.isRearranging
        ) {
            this.canvas.toggleDraggingBlock(true);
            this.canvas.registerDragger(theblock);

            const { draggedElement } = this.canvas;

            this.canvas.setState({
                dragX: mouseX - draggedElement.position().left,
                dragY: mouseY - draggedElement.position().top
            });
        }
    }

    hasParentClass(node, classname) {
        if (node.className && node.className.split(' ').indexOf(classname) >= 0) {
            return true;
        }

        return node.parentNode && this.hasParentClass(node.parentNode, classname);
    }


    endDrag(event) {

        if (this.canvas.isCanvasDragging) {
            this.canvas.toggleDraggingCanvas(false);
        }

        if (event.which === 3 || !(this.canvas.isDragging || this.canvas.isRearranging)) {
            return;
        }

        this.canvas.toggleDraggingBlock(false);

        this.onRelease();

        this.canvas.showIndicator(false);

        const { draggedElement } = this.canvas;

        if (this.canvas.isDragging) {
            this.canvas.toggleDragger(false);
        }

        if (draggedElement.id === 0 && this.canvas.isRearranging) {
            this.canvas.toggleDragger(false);
            this.canvas.toggleRearranging(false);
            this.canvas.ungroupDraggedTree();
        } else if (this.canvas.isDragging && this.canvas.blocks.length === 0) {
            if (this.canvas.inDropZone()) {
                this.onSnap(draggedElement.node, true, undefined);
                this.canvas.toggleDragging(false);
                this.canvas.drop();
            } else {
                this.canvas.cancelDrop();
            }
        } else if (this.canvas.isDragging || this.canvas.isRearranging) {
            const snapped = this.canvas.blocks.find((block, i) => {
                if (this.canvas.inSnapZoneFor(block)) {
                    this.canvas.toggleDragging(false);

                    if (this.canvas.isRearranging || this.onSnap(draggedElement.node, false, block)) {
                        this.snap(block);
                    }

                    return true;
                }
            });

            if (!snapped) {
                if (this.canvas.isRearranging) {
                    this.canvas.toggleRearranging(false);
                    // TODO: Determine if we need to do more than clear out `draggedTree`
                    // blocksTemp = []
                    this.canvas.draggedTree.splice(0);
                }

                this.canvas.toggleDragging(false);
                this.canvas.cancelDrop();
            }
        }
    }


    public snap(block) {
        const { draggedElement } = this.canvas;
        if (!this.canvas.isRearranging) {
            // TODO: replace with `canvas.drop()`?
            this.canvas.appendChild(draggedElement.node);
        }

        let totalRemove = 0;

        const childBlocks = this.canvas.findChildBlocks(block.id);

        const totalWidth = childBlocks.reduce(
            (total, { maxWidth }) => total + maxWidth() + this.canvas.spacingX,
            this.canvas.draggedElement.position().width
        );

        childBlocks.forEach(childBlock => {
            const { id, childWidth, width, maxWidth } = childBlock;
            const childElement = this.canvas.findBlockElement(id);
            let lft = block.x - totalWidth / 2 + totalRemove;

            childBlock.x = lft + maxWidth() / 2 + 200;
            totalRemove += maxWidth() + this.canvas.spacingX;

            if (childWidth > width) {
                lft += childWidth / 2 - width / 2;
            }

            childElement.styles({ left: lft + 'px' });
        });

        const { top, left, scrollTop, scrollLeft } = this.canvas.position();

        this.canvas.draggedElement.styles({
            left: block.x - totalWidth / 2 + totalRemove - left + scrollLeft + 'px',
            top: block.y + block.height / 2 + this.canvas.spacingY - top + 'px'
        });

        if (this.canvas.isRearranging) {
            const pos = draggedElement.position();
            const draggedTreeBlock = this.canvas.findBlock(draggedElement.id, { tree: true });

            draggedTreeBlock.x = draggedElement.position().left + pos.width / 2 + scrollLeft * 2;
            draggedTreeBlock.y = draggedElement.position().top + pos.height / 2 + scrollTop;
            draggedTreeBlock.parent = block.id;

            this.canvas.draggedTree.forEach(treeBlock => {
                if (treeBlock.id === draggedElement.id) {
                    return;
                }

                const blockElement = this.canvas.findBlockElement(treeBlock.id);
                const arrowElement = blockElement.arrow();
                const blockParent = blockElement.node;
                const arrowParent = arrowElement.node;

                blockElement.styles({
                    left: blockElement.position().left - left + scrollLeft + 'px',
                    top: blockElement.position().top - top + scrollTop + 'px'
                });
                arrowElement.styles({
                    left: arrowElement.position().left - left + scrollLeft + 20 + 'px',
                    top: arrowElement.position().top - top + scrollTop + 'px'
                });

                this.canvas.appendChild(blockParent, arrowParent);

                treeBlock.x = blockElement.position().left + pos.width / 2 + scrollLeft;
                treeBlock.y = blockElement.position().top + pos.height / 2 + scrollTop;
            });

            this.canvas.appendBlocks(this.canvas.draggedTree);
            this.canvas.draggedTree.splice(0);
        } else {
            this.canvas.addBlockForElement(draggedElement, { parent: block.id });
        }

        const draggedBlock = this.canvas.findBlock(draggedElement.id);
        const { x, y, height } = draggedBlock;
        const arrowX = x - block.x + 20;
        // TODO: should this be using the first match?

        const foundBlock = this.canvas.blocks.find(({ parent }) => parent === block.id);

        const arrowY = parseFloat((y - height / 2 - (foundBlock.y + foundBlock.height / 2) + scrollTop).toString());

        if (arrowX < 0) {
            this.canvas.appendHtml(`
            <div class="arrowblock">
              <input type="hidden" class="arrowid" value="${draggedElement.id}">
              <svg preserveaspectratio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="
                  M ${block.x - x + 5} 0
                  L ${block.x - x + 5} ${this.canvas.spacingY / 2}
                  L 5 ${this.canvas.spacingY / 2}
                  L 5 ${arrowY}" stroke="#C5CCD0" stroke-width="2px"/>
                <path d="
                  M 0 ${arrowY - 5}
                  H 10
                  L 5 ${arrowY}
                  L 0 ${arrowY - 5}
                  Z" fill="#C5CCD0"/>
              </svg>
            </div>
          `);
            draggedElement.arrow().styles({
                left: x - 5 - left + scrollLeft + 'px'
            });
        } else {
            this.canvas.appendHtml(`
            <div class="arrowblock">
              <input type="hidden" class="arrowid" value="${draggedElement.id}">
              <svg preserveaspectratio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="
                  M 20 0
                  L 20 ${this.canvas.spacingY / 2}
                  L ${arrowX} ${this.canvas.spacingY / 2}
                  L ${arrowX} ${arrowY}" stroke="#C5CCD0" stroke-width="2px"/>
                <path d="
                  M ${arrowX - 5} ${arrowY - 5}
                  H ${arrowX + 5}
                  L ${arrowX} ${arrowY}
                  L ${arrowX - 5} ${arrowY - 5}
                  Z" fill="#C5CCD0"/>
              </svg>
            </div>
          `);
            draggedElement.arrow().styles({
                left: block.x - 20 - left + scrollLeft + 'px'
            });
        }
        draggedElement.arrow().styles({
            top: block.y + block.height / 2 + 'px'
        });

        if (block.parent !== -1) {
            let loopBlock = block;

            do {
                const children = this.canvas.blocks.filter(({ parent }) => parent === loopBlock.id);

                loopBlock.childWidth = children.reduce((zwidth, { maxWidth }, w) => {
                    // skip one item
                    if (w !== 0) {
                        zwidth += this.canvas.spacingX;
                    }
                    return zwidth + maxWidth();
                }, 0);

                loopBlock = this.canvas.blocks.find(({ id }) => id === loopBlock.parent);
            } while (loopBlock.parent !== -1);

            loopBlock.childWidth = totalWidth;
        }

        if (this.canvas.isRearranging) {
            this.canvas.toggleRearranging(false);
            this.canvas.toggleDragger(false);
        }

        this.rearrangeMe();
        this.checkOffset();
    }

    checkOffset() {
        const widths = this.canvas.blocks.map(({ width }) => width);
        const currentOffsetLeft = Math.min(...this.canvas.blocks.map(({ x }, index) => x - widths[index] / 2));

        this.canvas.setState({ currentOffsetLeft });

        if (currentOffsetLeft < this.canvas.position().left) {
            this.canvas.toggleLastEvent(true);

            this.canvas.blocks.forEach(({ id, x, width, parent }) => {
                const blockElement = this.canvas.findBlockElement(id);

                blockElement.styles({
                    left: x - width / 2 - currentOffsetLeft + 20 + 'px'
                });

                if (parent === -1) {
                    return;
                }

                const arrowElement = blockElement.arrow();
                const parentX = this.canvas.blocks.find((block) => block.id === parent).x;
                const arrowX = x - parentX;

                arrowElement.styles({
                    left: arrowX < 0 ? x - currentOffsetLeft + 20 - 5 : parentX - 20 - currentOffsetLeft + 20 + 'px'
                });
            });

            this.canvas.blocks.forEach(block => {
                const blockElement = this.canvas.findBlockElement(block.id);

                block.x =
                    blockElement.position().left +
                    (this.canvas.position().left + this.canvas.position().scrollLeft) -
                    this.canvas.draggedElement.position().width / 2 -
                    40;
            });

            this.canvas.setState({ previousOffsetLeft: currentOffsetLeft });
        }
    }

    rearrangeMe() {
        const parents = this.canvas.blocks.map(({ parent }) => parent);

        for (let z = 0; z < parents.length; z++) {
            if (parents[z] === -1) {
                z++;
            }

            let totalRemove = 0;

            const parentBlock = this.canvas.findBlock(parents[z]);
            const childBlocks = this.canvas.findChildBlocks(parents[z]);

            const totalWidth = childBlocks.reduce((total, block, i) => {
                if (this.canvas.findChildBlocks(block.id).length === 0) {
                    block.childWidth = 0;
                }
                // skip one item
                if (i !== 0) {
                    total += this.canvas.spacingX;
                }

                return total + block.maxWidth();
            }, 0);

            if (parents[z] !== -1) {
                parentBlock.childWidth = totalWidth;
            }

            const { left, top } = this.canvas.position();

            childBlocks.forEach(block => {
                const blockElement = this.canvas.findBlockElement(block.id);
                const arrowElement = blockElement.arrow();

                if (block.childWidth > block.width) {
                    blockElement.styles({
                        left: parentBlock.x - totalWidth / 2 + totalRemove + block.childWidth / 2 - block.width / 2 - left + 'px'
                    });
                } else {
                    blockElement.styles({
                        left: parentBlock.x - totalWidth / 2 + totalRemove - left + 'px'
                    });
                }

                block.x = parentBlock.x - totalWidth / 2 + totalRemove + block.maxWidth() / 2;
                totalRemove += block.maxWidth() + this.canvas.spacingX;

                const parent = this.canvas.findBlock(block.parent);
                const { x: parentX, y: parentY, height: parentHeight } = parent;
                const { x, y, height } = this.canvas.blocks.find(({ id }) => id === block.id);
                const arrowX = x - parentX + 20;
                const arrowY = y - height / 2 - (parentY + parentHeight / 2);

                arrowElement.styles({
                    top: parentY + parentHeight / 2 - top + 'px'
                });

                if (arrowX < 0) {
                    arrowElement.styles({
                        left: x - 5 - left + 'px'
                    });
                    arrowElement.html(`
                <input type="hidden" class="arrowid" value="${block.id}">
                <svg preserveaspectratio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="
                    M ${parentX - x + 5} 0
                    L ${parent.x - x + 5} ${this.canvas.spacingY / 2}
                    L 5 ${this.canvas.spacingY / 2}
                    L 5 ${arrowY}" stroke="#C5CCD0" stroke-width="2px"/>
                  <path d="
                    M 0 ${arrowY - 5}
                    H 10
                    L 5 ${arrowY}
                    L 0 ${arrowY - 5}
                    Z" fill="#C5CCD0"/>
                </svg>
              `);
                } else {
                    arrowElement.styles({
                        left: parentX - 20 - left + 'px'
                    });
                    arrowElement.html(`
                <input type="hidden" class="arrowid" value="${block.id}">
                <svg preserveaspectratio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="
                    M 20 0
                    L 20 ${this.canvas.spacingY / 2}
                    L ${arrowX} ${this.canvas.spacingY / 2}
                    L ${arrowX} ${arrowY}" stroke="#C5CCD0" stroke-width="2px"/>
                  <path d="
                    M ${arrowX - 5} ${arrowY - 5}
                    H ${arrowX + 5}
                    L ${arrowX} ${arrowY}
                    L ${arrowX - 5} ${arrowY - 5}
                    Z" fill="#C5CCD0"/>
                </svg>
              `);
                }
            });
        }
    }

    moveBlock(event) {
        this.handleCoordinates(event);
        if (this.canvas.isCanvasDragging) {
            this.canvas.updateCanvasDragPosition();
        }
        if (this.canvas.isDraggingBlock) {
            this.canvas.toggleRearranging(true);
            this.canvas.toggleDragger(true);
            this.canvas.groupDraggedTree();

            if (this.canvas.blocks.length > 1) {
                this.rearrangeMe();
            }

            if (this.canvas.isLastEvent) {
                this.fixOffset();
            }

            this.canvas.toggleDraggingBlock(false);
        }

        if (this.canvas.isDragging) {
            this.canvas.updateDragPosition();
        } else if (this.canvas.isRearranging) {
            this.canvas.updateRearrangePosition();
        }

        if (!this.canvas.isDragging && !this.canvas.isRearranging) {
            return;
        }

        const snapped = this.canvas.blocks.find((block, i) => {
            if (this.canvas.inSnapZoneFor(block)) {
                this.canvas.showIndicator(true, block);
                return true;
            }
        });

        if (!snapped) {
            this.canvas.showIndicator(false);
        }
    }

    fixOffset() {
        const { previousOffsetLeft } = this.canvas.state;

        if (previousOffsetLeft >= this.canvas.position().left) {
            return;
        }

        this.canvas.toggleLastEvent(false);

        this.canvas.blocks.forEach(block => {
            const { id, x, width, parent } = block;
            const blockElement = this.canvas.findBlockElement(id);
            const arrowElement = blockElement.arrow();

            blockElement.styles({
                left: x - width / 2 - previousOffsetLeft - 20 + 'px'
            });
            block.x = blockElement.position().left + width / 2;

            if (parent === -1) {
                return;
            }

            const parentX = this.canvas.blocks.find((blc) => blc.id === parent).x;
            const arrowX = x - parentX;

            arrowElement.styles({
                left: arrowX < 0 ? x - 5 - this.canvas.position().left : parentX - 20 - this.canvas.position().left + 'px'
            });
        });

        this.canvas.setState({ previousOffsetLeft: 0 });
    }

}
