extends Control

const LEVELS_PATH := "res://data/levels.json"
const SAVE_PATH := "user://progress.cfg"
const PET_DATA := {
	"orange": {"name": "小橘", "ability": "推动木箱 · 重型踏板", "icon": "res://assets/svg/pet_orange.svg", "color": Color("#f47b4a")},
	"doubao": {"name": "豆包", "ability": "穿过栅栏缝隙", "icon": "res://assets/svg/pet_doubao.svg", "color": Color("#6fbf73")},
	"snow": {"name": "雪团", "ability": "激活符文冰桥", "icon": "res://assets/svg/pet_snow.svg", "color": Color("#55b8d0")},
}

var levels: Array[Dictionary] = []
var game_state: GameState
var board: BoardView
var current_level_index := 0
var current_screen := "menu"
var completion_open := false
var progress := ConfigFile.new()
var step_label: Label
var fish_label: Label
var selected_label: Label


func _ready() -> void:
	_load_levels()
	progress.load(SAVE_PATH)
	show_main_menu()


func _unhandled_input(event: InputEvent) -> void:
	if current_screen != "game" or completion_open or not is_instance_valid(game_state):
		return
	var direction := Vector2i.ZERO
	if event.is_action_pressed("move_up"):
		direction = Vector2i.UP
	elif event.is_action_pressed("move_down"):
		direction = Vector2i.DOWN
	elif event.is_action_pressed("move_left"):
		direction = Vector2i.LEFT
	elif event.is_action_pressed("move_right"):
		direction = Vector2i.RIGHT
	elif event.is_action_pressed("select_orange"):
		game_state.select_pet("orange")
	elif event.is_action_pressed("select_doubao"):
		game_state.select_pet("doubao")
	elif event.is_action_pressed("select_snow"):
		game_state.select_pet("snow")
	elif event.is_action_pressed("undo"):
		game_state.undo()
	elif event.is_action_pressed("restart"):
		start_level(current_level_index)
	if direction != Vector2i.ZERO:
		game_state.try_move(direction)
	get_viewport().set_input_as_handled()


func show_main_menu() -> void:
	current_screen = "menu"
	completion_open = false
	_clear_screen()
	_add_background(Color("#edf2e6"))

	var accent := ColorRect.new()
	accent.color = Color("#273b42")
	accent.position = Vector2(0, 0)
	accent.size = Vector2(22, 720)
	add_child(accent)

	var eyebrow := _label("玩具机关 · 协作解谜", 18, Color("#587067"))
	eyebrow.position = Vector2(88, 80)
	eyebrow.size = Vector2(520, 34)
	add_child(eyebrow)
	var title := _label("萌宠解困局", 62, Color("#20343a"))
	title.position = Vector2(84, 112)
	title.size = Vector2(600, 88)
	add_child(title)
	var intro := _label("切换三位伙伴，读懂机关的因果，\n让每一只萌宠都平安回家。", 24, Color("#4f625d"))
	intro.position = Vector2(90, 202)
	intro.size = Vector2(560, 78)
	intro.add_theme_constant_override("line_spacing", 8)
	add_child(intro)

	var continue_index := _latest_unlocked_index()
	_add_button("继续游戏", Vector2(90, 320), Vector2(270, 58), func() -> void: start_level(continue_index), Color("#e45f3d"))
	_add_button("选择关卡", Vector2(90, 392), Vector2(270, 54), show_level_select, Color("#3f6f78"))
	_add_button("游戏设置", Vector2(90, 460), Vector2(270, 54), show_settings, Color("#5e7568"))

	var rule_title := _label("三种能力，一条归途", 28, Color("#20343a"))
	rule_title.position = Vector2(760, 80)
	rule_title.size = Vector2(410, 44)
	add_child(rule_title)
	var y := 145.0
	for pet: String in GameState.PET_ORDER:
		_add_pet_feature(pet, Vector2(748, y))
		y += 130.0

	var progress_text := "已收集 %d / 36 颗星" % _total_stars()
	var progress_label := _label(progress_text, 18, Color("#53655f"))
	progress_label.position = Vector2(760, 570)
	progress_label.size = Vector2(330, 32)
	add_child(progress_label)
	var chapter_label := _label("玩具屋  →  后花园  →  星光工坊", 18, Color("#7b8d85"))
	chapter_label.position = Vector2(760, 608)
	chapter_label.size = Vector2(430, 32)
	add_child(chapter_label)


func show_level_select() -> void:
	current_screen = "levels"
	_clear_screen()
	_add_background(Color("#eef2eb"))
	_add_header("关卡选择", "选择一段旅程继续解谜", show_main_menu)
	for index: int in levels.size():
		var column := index % 4
		var row := index / 4
		var position := Vector2(74 + column * 298, 145 + row * 158)
		_add_level_card(index, position)


func show_settings() -> void:
	current_screen = "settings"
	_clear_screen()
	_add_background(Color("#eef2eb"))
	_add_header("游戏设置", "调整声音与显示方式", show_main_menu)

	var panel := Panel.new()
	panel.position = Vector2(330, 170)
	panel.size = Vector2(620, 390)
	panel.add_theme_stylebox_override("panel", _panel_style(Color("#ffffff"), Color("#cdd8d1")))
	add_child(panel)

	var volume_title := _label("主音量", 22, Color("#263a40"))
	volume_title.position = Vector2(390, 230)
	volume_title.size = Vector2(180, 36)
	add_child(volume_title)
	var slider := HSlider.new()
	slider.position = Vector2(560, 232)
	slider.size = Vector2(300, 36)
	slider.min_value = 0
	slider.max_value = 100
	slider.value = float(progress.get_value("settings", "volume", 80.0))
	slider.value_changed.connect(_on_volume_changed)
	add_child(slider)

	var fullscreen := CheckButton.new()
	fullscreen.text = "全屏显示"
	fullscreen.position = Vector2(385, 310)
	fullscreen.size = Vector2(470, 48)
	fullscreen.button_pressed = DisplayServer.window_get_mode() == DisplayServer.WINDOW_MODE_FULLSCREEN
	fullscreen.add_theme_font_size_override("font_size", 22)
	fullscreen.toggled.connect(_on_fullscreen_toggled)
	add_child(fullscreen)

	var controls := _label("操作：WASD / 方向键移动\n1 / 2 / 3 切换萌宠\nZ 或 U 撤销，R 重开", 20, Color("#586b64"))
	controls.position = Vector2(390, 390)
	controls.size = Vector2(480, 110)
	controls.add_theme_constant_override("line_spacing", 8)
	add_child(controls)


func start_level(index: int) -> void:
	if levels.is_empty():
		return
	current_level_index = clampi(index, 0, levels.size() - 1)
	current_screen = "game"
	completion_open = false
	_clear_screen()
	_add_background(Color("#dce7df"))

	var top_bar := ColorRect.new()
	top_bar.color = Color("#22363d")
	top_bar.position = Vector2.ZERO
	top_bar.size = Vector2(1280, 66)
	add_child(top_bar)
	var top_title := _label("萌宠解困局", 25, Color.WHITE)
	top_title.position = Vector2(26, 15)
	top_title.size = Vector2(240, 38)
	add_child(top_title)
	var chapter := _label("%s  ·  第 %02d 关" % [levels[current_level_index]["chapter"], current_level_index + 1], 18, Color("#b9d3cc"))
	chapter.position = Vector2(270, 19)
	chapter.size = Vector2(350, 30)
	add_child(chapter)
	_add_button("关卡", Vector2(1095, 12), Vector2(74, 42), show_level_select, Color("#42616a"), 16)
	_add_button("菜单", Vector2(1175, 12), Vector2(74, 42), show_main_menu, Color("#42616a"), 16)

	board = BoardView.new()
	board.position = Vector2(18, 82)
	board.size = Vector2(930, 620)
	add_child(board)
	board.pet_clicked.connect(_on_pet_selected)
	board.cell_clicked.connect(_on_cell_clicked)

	_build_sidebar()
	game_state = GameState.new()
	game_state.setup(levels[current_level_index])
	game_state.changed.connect(_on_state_changed)
	game_state.level_completed.connect(_on_level_completed)
	board.set_game_state(game_state)
	_update_hud()


func _build_sidebar() -> void:
	var sidebar := Panel.new()
	sidebar.position = Vector2(965, 82)
	sidebar.size = Vector2(297, 620)
	sidebar.add_theme_stylebox_override("panel", _panel_style(Color("#f7f9f5"), Color("#c6d2cb")))
	add_child(sidebar)

	var level_data := levels[current_level_index]
	var title := _label(str(level_data["title"]), 28, Color("#24393f"))
	title.position = Vector2(990, 104)
	title.size = Vector2(250, 42)
	add_child(title)
	var subtitle := _label(str(level_data["subtitle"]), 17, Color("#6a7c74"))
	subtitle.position = Vector2(990, 146)
	subtitle.size = Vector2(245, 50)
	subtitle.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	add_child(subtitle)

	selected_label = _label("", 17, Color("#364c52"))
	selected_label.position = Vector2(990, 204)
	selected_label.size = Vector2(245, 30)
	add_child(selected_label)
	var x := 990.0
	for pet: String in GameState.PET_ORDER:
		var pet_button := Button.new()
		pet_button.position = Vector2(x, 240)
		pet_button.size = Vector2(70, 66)
		pet_button.icon = load(PET_DATA[pet]["icon"])
		pet_button.expand_icon = true
		pet_button.tooltip_text = "%s：%s" % [PET_DATA[pet]["name"], PET_DATA[pet]["ability"]]
		pet_button.pressed.connect(_on_pet_selected.bind(pet))
		pet_button.add_theme_stylebox_override("normal", _button_style(Color("#e6ede8")))
		pet_button.add_theme_stylebox_override("hover", _button_style(Color("#d7e6dc")))
		add_child(pet_button)
		x += 82.0

	step_label = _label("", 20, Color("#263d43"))
	step_label.position = Vector2(990, 330)
	step_label.size = Vector2(245, 34)
	add_child(step_label)
	fish_label = _label("", 20, Color("#263d43"))
	fish_label.position = Vector2(990, 368)
	fish_label.size = Vector2(245, 34)
	add_child(fish_label)

	var tip_box := Panel.new()
	tip_box.position = Vector2(986, 420)
	tip_box.size = Vector2(255, 92)
	tip_box.add_theme_stylebox_override("panel", _panel_style(Color("#e7f0e4"), Color("#b9cdb8")))
	add_child(tip_box)
	var tip := _label("提示\n" + str(level_data["tip"]), 16, Color("#4a6258"))
	tip.position = Vector2(1002, 432)
	tip.size = Vector2(224, 70)
	tip.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	add_child(tip)

	_add_button("撤销", Vector2(990, 535), Vector2(116, 48), func() -> void: game_state.undo(), Color("#537b70"), 17)
	_add_button("重开", Vector2(1118, 535), Vector2(116, 48), func() -> void: start_level(current_level_index), Color("#8b6657"), 17)
	var keys := _label("移动 WASD / 方向键    撤销 Z", 14, Color("#778982"))
	keys.position = Vector2(990, 612)
	keys.size = Vector2(250, 28)
	add_child(keys)


func _on_state_changed() -> void:
	if is_instance_valid(board):
		board.refresh()
	_update_hud()


func _update_hud() -> void:
	if not is_instance_valid(game_state) or not is_instance_valid(step_label):
		return
	step_label.text = "步数  %d / %d" % [game_state.steps, int(game_state.level["par"])]
	fish_label.text = "小鱼干  %d / %d" % [game_state.fish_collected, int(game_state.level.get("fish", []).size())]
	var pet: String = game_state.selected_pet
	selected_label.text = "当前伙伴：%s" % PET_DATA[pet]["name"]


func _on_pet_selected(pet: String) -> void:
	if is_instance_valid(game_state):
		game_state.select_pet(pet)


func _on_cell_clicked(cell: Vector2i) -> void:
	if not is_instance_valid(game_state) or game_state.selected_pet in game_state.rescued:
		return
	var current: Vector2i = game_state.positions[game_state.selected_pet]
	var delta := cell - current
	if abs(delta.x) + abs(delta.y) == 1:
		game_state.try_move(delta)


func _on_level_completed(stars: int) -> void:
	completion_open = true
	var key := "level_%d" % (current_level_index + 1)
	var previous := int(progress.get_value("stars", key, 0))
	progress.set_value("stars", key, max(previous, stars))
	progress.save(SAVE_PATH)

	var shade := ColorRect.new()
	shade.color = Color(0.05, 0.09, 0.1, 0.72)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shade.z_index = 50
	add_child(shade)
	var panel := Panel.new()
	panel.position = Vector2(410, 142)
	panel.size = Vector2(460, 430)
	panel.z_index = 51
	panel.add_theme_stylebox_override("panel", _panel_style(Color("#f7faf5"), Color("#cbd8cf")))
	add_child(panel)
	var heading := _label("伙伴们安全会合！", 32, Color("#243b40"))
	heading.position = Vector2(475, 190)
	heading.size = Vector2(340, 48)
	heading.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	heading.z_index = 52
	add_child(heading)
	var stars_label := _label("★".repeat(stars) + "☆".repeat(3 - stars), 54, Color("#efb83f"))
	stars_label.position = Vector2(490, 255)
	stars_label.size = Vector2(300, 72)
	stars_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	stars_label.z_index = 52
	add_child(stars_label)
	var result := _label("本关步数  %d\n小鱼干  %d / %d" % [game_state.steps, game_state.fish_collected, int(game_state.level.get("fish", []).size())], 20, Color("#5c6f67"))
	result.position = Vector2(520, 340)
	result.size = Vector2(240, 72)
	result.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	result.z_index = 52
	add_child(result)
	if current_level_index < levels.size() - 1:
		var next := _add_button("下一关", Vector2(485, 450), Vector2(145, 54), func() -> void: start_level(current_level_index + 1), Color("#e45f3d"))
		next.z_index = 52
	var choose := _add_button("关卡选择", Vector2(650, 450), Vector2(145, 54), show_level_select, Color("#496f76"))
	choose.z_index = 52


func _add_level_card(index: int, position: Vector2) -> void:
	var unlocked := _is_level_unlocked(index)
	var stars := int(progress.get_value("stars", "level_%d" % (index + 1), 0))
	var card := Button.new()
	card.position = position
	card.size = Vector2(260, 126)
	card.disabled = not unlocked
	card.text = "%02d   %s\n%s\n%s" % [index + 1, levels[index]["title"], levels[index]["chapter"], "★".repeat(stars) + "☆".repeat(3 - stars)]
	card.alignment = HORIZONTAL_ALIGNMENT_LEFT
	card.add_theme_font_size_override("font_size", 17)
	card.add_theme_color_override("font_color", Color("#294048"))
	card.add_theme_color_override("font_disabled_color", Color("#8c9994"))
	card.add_theme_stylebox_override("normal", _button_style(Color("#f8faf7"), Color("#c7d4cc")))
	card.add_theme_stylebox_override("hover", _button_style(Color("#e5efe7"), Color("#86a494")))
	card.add_theme_stylebox_override("disabled", _button_style(Color("#e2e7e3"), Color("#d1d8d3")))
	card.pressed.connect(start_level.bind(index))
	add_child(card)


func _add_pet_feature(pet: String, position: Vector2) -> void:
	var icon := TextureRect.new()
	icon.texture = load(PET_DATA[pet]["icon"])
	icon.position = position
	icon.size = Vector2(96, 96)
	icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	add_child(icon)
	var name_label := _label(str(PET_DATA[pet]["name"]), 25, PET_DATA[pet]["color"])
	name_label.position = position + Vector2(116, 12)
	name_label.size = Vector2(220, 35)
	add_child(name_label)
	var ability := _label(str(PET_DATA[pet]["ability"]), 18, Color("#61726b"))
	ability.position = position + Vector2(116, 52)
	ability.size = Vector2(260, 30)
	add_child(ability)


func _add_header(title_text: String, subtitle_text: String, back: Callable) -> void:
	var bar := ColorRect.new()
	bar.color = Color("#24383f")
	bar.position = Vector2.ZERO
	bar.size = Vector2(1280, 96)
	add_child(bar)
	var title := _label(title_text, 34, Color.WHITE)
	title.position = Vector2(75, 22)
	title.size = Vector2(450, 48)
	add_child(title)
	var subtitle := _label(subtitle_text, 17, Color("#b7d0c8"))
	subtitle.position = Vector2(75, 62)
	subtitle.size = Vector2(470, 26)
	add_child(subtitle)
	_add_button("返回", Vector2(1130, 24), Vector2(92, 48), back, Color("#45636b"), 17)


func _add_background(color: Color) -> void:
	var background := ColorRect.new()
	background.color = color
	background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	background.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(background)


func _add_button(text_value: String, position: Vector2, button_size: Vector2, callback: Callable, color: Color, font_size := 20) -> Button:
	var button := Button.new()
	button.text = text_value
	button.position = position
	button.size = button_size
	button.add_theme_font_size_override("font_size", font_size)
	button.add_theme_color_override("font_color", Color.WHITE)
	button.add_theme_color_override("font_hover_color", Color.WHITE)
	button.add_theme_stylebox_override("normal", _button_style(color))
	button.add_theme_stylebox_override("hover", _button_style(color.lightened(0.09)))
	button.add_theme_stylebox_override("pressed", _button_style(color.darkened(0.08)))
	button.pressed.connect(callback)
	add_child(button)
	return button


func _label(text_value: String, font_size: int, color: Color) -> Label:
	var result := Label.new()
	result.text = text_value
	result.add_theme_font_size_override("font_size", font_size)
	result.add_theme_color_override("font_color", color)
	result.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	return result


func _button_style(color: Color, border := Color.TRANSPARENT) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = color
	style.border_width_left = 1
	style.border_width_top = 1
	style.border_width_right = 1
	style.border_width_bottom = 1
	style.border_color = border
	style.corner_radius_top_left = 6
	style.corner_radius_top_right = 6
	style.corner_radius_bottom_left = 6
	style.corner_radius_bottom_right = 6
	style.content_margin_left = 18
	style.content_margin_right = 18
	return style


func _panel_style(color: Color, border: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = color
	style.border_width_left = 1
	style.border_width_top = 1
	style.border_width_right = 1
	style.border_width_bottom = 1
	style.border_color = border
	style.corner_radius_top_left = 8
	style.corner_radius_top_right = 8
	style.corner_radius_bottom_left = 8
	style.corner_radius_bottom_right = 8
	style.shadow_color = Color(0.05, 0.09, 0.08, 0.12)
	style.shadow_size = 8
	return style


func _load_levels() -> void:
	var file := FileAccess.open(LEVELS_PATH, FileAccess.READ)
	if file == null:
		push_error("无法读取关卡数据：" + LEVELS_PATH)
		return
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if not (parsed is Dictionary) or not parsed.has("levels"):
		push_error("关卡数据格式错误")
		return
	for level_data: Variant in parsed["levels"]:
		levels.append(level_data)


func _is_level_unlocked(index: int) -> bool:
	if index <= 0:
		return true
	return int(progress.get_value("stars", "level_%d" % index, 0)) > 0


func _latest_unlocked_index() -> int:
	var result := 0
	for index: int in levels.size():
		if _is_level_unlocked(index):
			result = index
	return result


func _total_stars() -> int:
	var total := 0
	for index: int in levels.size():
		total += int(progress.get_value("stars", "level_%d" % (index + 1), 0))
	return total


func _on_volume_changed(value: float) -> void:
	progress.set_value("settings", "volume", value)
	progress.save(SAVE_PATH)
	AudioServer.set_bus_volume_db(0, linear_to_db(value / 100.0))


func _on_fullscreen_toggled(enabled: bool) -> void:
	DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN if enabled else DisplayServer.WINDOW_MODE_WINDOWED)


func _clear_screen() -> void:
	for child: Node in get_children():
		child.queue_free()
