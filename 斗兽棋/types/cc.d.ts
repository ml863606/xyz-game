declare module 'cc' {
  export namespace _decorator {
    export function ccclass(name: string): ClassDecorator;
  }

  export class Component {
    node: Node;
    onLoad?(): void;
    start?(): void;
  }

  export class Node {
    static EventType: {
      TOUCH_END: string;
      TOUCH_CANCEL: string;
    };

    name: string;

    constructor(name?: string);
    addChild(child: Node): void;
    removeAllChildren(): void;
    setPosition(position: Vec3): void;
    on(event: string, callback: () => void): void;
    addComponent<T>(component: new () => T): T;
    getComponent<T>(component: new () => T): T | null;
  }

  export class UITransform {
    setContentSize(width: number, height: number): void;
  }

  export class Vec3 {
    constructor(x?: number, y?: number, z?: number);
  }

  export class Color {
    constructor(r?: number, g?: number, b?: number, a?: number);
  }

  export class Sprite {
    color: Color;
    spriteFrame: SpriteFrame | null;
  }

  export class SpriteFrame {}

  export class Label {
    static Overflow: {
      SHRINK: number;
    };

    string: string;
    fontSize: number;
    lineHeight: number;
    color: Color;
    overflow: number;
    node: Node;
  }

  export class Button {
    static EventType: {
      CLICK: string;
    };

    static Transition: {
      COLOR: number;
    };

    transition: number;
    normalColor: Color;
    hoverColor: Color;
    pressedColor: Color;
    node: Node;
  }

  export const view: {
    getVisibleSize(): { width: number; height: number };
  };
}
