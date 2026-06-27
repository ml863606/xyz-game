import {
  _decorator,
  Button,
  Color,
  Component,
  Label,
  Node,
  Sprite,
  SpriteFrame,
  UITransform,
  Vec3,
} from 'cc';
import { Theme } from './Theme';

const { ccclass } = _decorator;

@ccclass('UiFactory')
export class UiFactory extends Component {}

export function makeNode(name: string, parent: Node, width: number, height: number): Node {
  const node = new Node(name);
  parent.addChild(node);
  node.addComponent(UITransform).setContentSize(width, height);
  return node;
}

export function makePanel(name: string, parent: Node, width: number, height: number, color = Theme.panel): Node {
  const node = makeNode(name, parent, width, height);
  const sprite = node.addComponent(Sprite);
  sprite.color = color;
  return node;
}

export function makeLabel(
  name: string,
  parent: Node,
  text: string,
  fontSize: number,
  width: number,
  height: number,
  color: Color = Theme.text,
): Label {
  const node = makeNode(name, parent, width, height);
  const label = node.addComponent(Label);
  label.string = text;
  label.fontSize = fontSize;
  label.lineHeight = Math.round(fontSize * 1.25);
  label.color = color;
  label.overflow = Label.Overflow.SHRINK;
  return label;
}

export function makeButton(
  name: string,
  parent: Node,
  text: string,
  width: number,
  height: number,
  onClick: () => void,
): Button {
  const node = makePanel(name, parent, width, height, Theme.panelAlt);
  const button = node.addComponent(Button);
  button.transition = Button.Transition.COLOR;
  button.normalColor = Theme.panelAlt;
  button.hoverColor = new Color(75, 85, 99, 255);
  button.pressedColor = new Color(100, 116, 139, 255);
  button.node.on(Button.EventType.CLICK, onClick);

  const label = makeLabel(`${name}Label`, node, text, 24, width - 16, height - 10, Theme.text);
  label.node.setPosition(new Vec3(0, -2, 0));
  return button;
}

export function setSpriteColor(node: Node, color: Color): void {
  let sprite = node.getComponent(Sprite);
  if (!sprite) {
    sprite = node.addComponent(Sprite);
  }

  sprite.spriteFrame = sprite.spriteFrame ?? new SpriteFrame();
  sprite.color = color;
}

