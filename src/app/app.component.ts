import { Component, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import { Engine } from './flowy/engine';

declare var flowy: any;

export interface Action {
  type: string;
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {
  @ViewChild('canvas', { static: false }) public canvas!: ElementRef;

  spacingx = 40;
  spacingy = 40;
  engine!: Engine;

  actions: Action[] = [
    {
      type: '1',
      icon: 'assets/eye.svg',
      title: 'New visitor',
      description: 'Triggers when somebody visits a specified page'
    },
    {
      type: '2',
      icon: 'assets/action.svg',
      title: 'Action is performed',
      description: 'Triggers when somebody performs a specified action'
    },
    {
      type: '3',
      icon: 'assets/time.svg',
      title: 'Time has passed',
      description: 'Triggers after a specified amount of time'
    },
    {
      type: '4',
      icon: 'assets/error.svg',
      title: 'Error prompt',
      description: 'Triggers when a specified error happens'
    }
  ];

  ngAfterViewInit(): void {
    this.engine = new Engine(
      this.canvas.nativeElement,
      this.spacingx,
      this.spacingy,
      this.onGrab,
      this.onRelease,
      this.onSnap.bind(this)
      );
  }

  onGrab(block){

  }
  onRelease(){

  }
  onSnap(drag){
    const grab = drag.querySelector('.grabme');
    grab.parentNode.removeChild(grab);
    const blockin = drag.querySelector('.blockin');
    blockin.parentNode.removeChild(blockin);
    drag.innerHTML += this.getPlacedElement(drag.querySelector('.blockelemtype').value);
    return true;
  }

  getPlacedElement(type: string) {
    const foundType = this.actions.find(action => action.type === type);
    return `<div class="blockyleft">
    <img src="${foundType.icon}">
      <p class="blockyname">${foundType.title}</p>
    </div>
    <div class="blockyright">
      <img src="assets/more.svg">
    </div>
    <div class="blockydiv"></div>
    <div class="blockyinfo">When a <span>new visitor</span> goes to <span>Site 1</span></div>`;
  }
}


