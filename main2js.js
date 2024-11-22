import * as THREE from './libs/three/three.module.js';
import { FontLoader } from './jsm/loaders/FontLoader.js';
import { GLTFLoader } from './jsm/loaders/GLTFLoader.js';
import { TextGeometry } from './jsm/geometries/TextGeometry.js';
import { OrbitControls } from './jsm/controls/OrbitControls.js';

// Создаём сцену
const scene = new THREE.Scene();

// Настройка камеры
const container = document.getElementById('container');
const containerWidth = container.clientWidth;
const containerHeight = container.clientHeight;
const camera = new THREE.PerspectiveCamera(45, containerWidth / containerHeight, 0.1, 1000);
const cameraOffset = new THREE.Vector3(0, 5, 20); // Увеличенный отступ камеры относительно машины
camera.position.copy(cameraOffset);
camera.lookAt(scene.position);

// Настройка рендерера
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(containerWidth, containerHeight);
container.appendChild(renderer.domElement);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0xd3d3d3, 1); // Светло-серый фон (изменено на более светлый)
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Добавление света
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Загрузка текстуры земли
const textureLoader = new THREE.TextureLoader();
const groundTexture = textureLoader.load('textures/ground_texture.jpg');
groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
groundTexture.repeat.set(100, 100);

// Добавление плоскости (земли)
const planeGeometry = new THREE.PlaneGeometry(500, 500);
const planeMaterial = new THREE.MeshStandardMaterial({ map: groundTexture });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2;
plane.position.y = 0; // Опущено на уровень пола
plane.receiveShadow = true;
scene.add(plane);

// Добавление сетки
const gridHelper = new THREE.GridHelper(500, 50, 0x808080, 0x808080); // Изменен цвет сетки на светло-серый
gridHelper.position.y = 0.01; // Немного выше плоскости, чтобы было видно
scene.add(gridHelper);

// Настройка OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = true;
controls.minDistance = 10;
controls.maxDistance = 100;

// Инициализация переменных
let font;
const cars = [];
let currentCarIndex = 0;
const labels = [];
const labelArrows = [];
const attachmentPoints = []; // Массив для хранения точек привязки (красных шариков)
const carNameLabels = []; // Массив для хранения названий машин

// Пути к моделям автомобилей
const carModels = ['car1.glb', 'car2.glb', 'car3.glb'];

// Скорости автомобилей
const carSpeeds = {
	car1: 0.4, // Средняя скорость
	car2: 0.2, // Низкая скорость (грузовик)
	car3: 0.7, // Высокая скорость (спорткар)
};

// Данные выносок для каждой модели
const labelData = {
	car1: [
		{
			name: 'Hood',
			position: new THREE.Vector3(-0.19, 1.35, -0.49), // Позиция точки привязки
			labelPosition: new THREE.Vector3(-0.17, 2.97, 0.19), // Позиция выноски
		},
		{
			name: 'Doors',
			position: new THREE.Vector3(0.8, 1.74, -0.12),
			labelPosition: new THREE.Vector3(2.41, 2.5, -1.3),
		},
		{
			name: 'Headlights',
			position: new THREE.Vector3(-0.63, 1.44, 2.16),
			labelPosition: new THREE.Vector3(-2.67, 2.8, 2.5),
		},
		{
			name: 'Wheels',
			position: new THREE.Vector3(0.8, 1, 1.5),
			labelPosition: new THREE.Vector3(3.39, 2.36, 1.03),
		},
	],
	car2: [
		{
			name: 'Hood',
			position: new THREE.Vector3(0.0, 4.3, -1.52),
			labelPosition: new THREE.Vector3(-0.06, 6.47, -1.08),
		},
		{
			name: 'Doors',
			position: new THREE.Vector3(1, 2.31, 1.8),
			labelPosition: new THREE.Vector3(4.12, 4.55, 0.0),
		},
		{
			name: 'Headlights',
			position: new THREE.Vector3(-0.6, 2.2, 3.5),
			labelPosition: new THREE.Vector3(-2.68, 3.24, 2.3),
		},
		{
			name: 'Wheels',
			position: new THREE.Vector3(1.1, 1.63, 2.89),
			labelPosition: new THREE.Vector3(3.54, 3.13, 2.02),
		},
	],
	car3: [
		{
			name: 'Hood',
			position: new THREE.Vector3(0.0, 1.59, -0.31),
			labelPosition: new THREE.Vector3(0.0, 3.96, -0.34),
		},
		{
			name: 'Doors',
			position: new THREE.Vector3(0.8, 1.03, 0),
			labelPosition: new THREE.Vector3(1.4, 2.5, 0.0),
		},
		{
			name: 'Headlights',
			position: new THREE.Vector3(-0.61, 0.97, 1.82),
			labelPosition: new THREE.Vector3(-3.13, 1.56, 2.4),
		},
		{
			name: 'Wheels',
			position: new THREE.Vector3(0.79, 0.62, 1.33),
			labelPosition: new THREE.Vector3(1.15, 1.5, 2.0),
		},
	],
};

// Загрузка шрифта
const fontLoader = new FontLoader();
fontLoader.load('./fonts/helvetiker_bold.typeface.json', function (loadedFont) {
	font = loadedFont;
	loadCarModels();
});

// Загрузка моделей автомобилей
const gltfLoader = new GLTFLoader();

function centerModel(model) {
	const box = new THREE.Box3().setFromObject(model);
	const center = box.getCenter(new THREE.Vector3());
	const size = box.getSize(new THREE.Vector3());

	model.position.sub(center); // Центрируем модель

	// Опускаем модель на плоскость
	const yOffset = size.y / 2;
	model.position.y = yOffset;
}

function loadCarModels() {
	let loadedModels = 0;

	carModels.forEach((modelPath, index) => {
		gltfLoader.load(
			`model/${modelPath}`,
			function (gltf) {
				const model = gltf.scene;
				centerModel(model);
				model.traverse(function (child) {
					if (child.isMesh) {
						child.castShadow = true;
						child.receiveShadow = true;
					}
				});
				model.visible = false;
				scene.add(model);
				cars[index] = model;
				loadedModels++;

				if (loadedModels === carModels.length) {
					cars[currentCarIndex].visible = true;
					addLabelsToCar(cars[currentCarIndex], `car${currentCarIndex + 1}`);
					addCarNameLabel(cars[currentCarIndex], `car${currentCarIndex + 1}`);
					updateCameraPosition();
					animateScene();
				}
			},
			undefined,
			function (error) {
				console.error(`Ошибка загрузки модели ${modelPath}:`, error);
			}
		);
	});
}

function addLabelsToCar(car, carKey) {
	removeExistingLabels();

	const currentLabelData = labelData[carKey];

	currentLabelData.forEach((data) => {
		const label = createLabel(data.name);
		const labelPosition = data.labelPosition.clone(); // Используем сохраненную позицию выноски
		label.position.copy(labelPosition);
		car.add(label); // Добавляем лейбл в модель машины
		labels.push(label);

		// Создание точки привязки на машине
		const attachmentPoint = new THREE.Mesh(
			new THREE.SphereGeometry(0.1, 8, 8),
			new THREE.MeshBasicMaterial({ color: 0xff0000 })
		);
		const attachmentPosition = data.position.clone();
		attachmentPoint.position.copy(attachmentPosition);
		car.add(attachmentPoint);
		attachmentPoints.push(attachmentPoint); // Добавляем в массив для последующего удаления

		// Создание линии между выноской и точкой привязки
		const points = [];
		points.push(new THREE.Vector3(0, 0, 0)); // Локальная позиция точки привязки
		points.push(
			new THREE.Vector3(
				data.labelPosition.x - data.position.x,
				data.labelPosition.y - data.position.y,
				data.labelPosition.z - data.position.z
			)
		); // Локальная позиция выноски относительно точки привязки

		const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
		const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
		const line = new THREE.Line(lineGeometry, lineMaterial);
		attachmentPoint.add(line); // Добавляем линию как дочерний объект точки привязки
		labelArrows.push(line);
	});
}

function addCarNameLabel(car, carKey) {
	removeExistingCarNameLabel();

	const carNames = {
		car1: 'Base Car',
		car2: 'Truck',
		car3: 'Sport Car',
	};

	const carName = carNames[carKey];

	const nameLabel = createCarNameLabel(carName);

	// Располагаем лейбл над машиной
	const box = new THREE.Box3().setFromObject(car);
	const size = box.getSize(new THREE.Vector3());
	nameLabel.position.set(0, size.y, 0);

	car.add(nameLabel);
	carNameLabels.push(nameLabel);
}

function removeExistingLabels() {
	labels.forEach((label) => {
		cars[currentCarIndex].remove(label);
	});
	labels.length = 0;

	labelArrows.forEach((arrow) => {
		arrow.parent.remove(arrow);
	});
	labelArrows.length = 0;

	// Удаляем точки привязки (красные шарики)
	attachmentPoints.forEach((point) => {
		cars[currentCarIndex].remove(point);
	});
	attachmentPoints.length = 0;
}

function removeExistingCarNameLabel() {
	carNameLabels.forEach((label) => {
		cars[currentCarIndex].remove(label);
	});
	carNameLabels.length = 0;
}

function createLabel(text) {
	const textGeometry = new TextGeometry(text, {
		font: font,
		size: 0.4,
		height: 0.05,
		curveSegments: 12,
		bevelEnabled: true,
		bevelThickness: 0.01,
		bevelSize: 0.02,
		bevelOffset: 0,
		bevelSegments: 5,
	});

	textGeometry.computeBoundingBox();
	const center = textGeometry.boundingBox.getCenter(new THREE.Vector3());
	textGeometry.translate(-center.x, -center.y, -center.z);

	const textMaterial = new THREE.MeshStandardMaterial({
		color: 0xffffff,
	});

	const textMesh = new THREE.Mesh(textGeometry, textMaterial);

	// Добавляем фон к тексту
	const backgroundMaterial = new THREE.MeshBasicMaterial({
		color: 0x000000,
		opacity: 0.5,
		transparent: true,
	});
	const backgroundGeometry = new THREE.PlaneGeometry(
		(textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x) * 1.2,
		(textGeometry.boundingBox.max.y - textGeometry.boundingBox.min.y) * 1.5
	);
	const backgroundMesh = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
	backgroundMesh.position.set(0, 0, -0.05); // Немного позади текста

	const labelGroup = new THREE.Group();
	labelGroup.add(backgroundMesh);
	labelGroup.add(textMesh);

	return labelGroup;
}

function createCarNameLabel(text) {
	const textGeometry = new TextGeometry(text, {
		font: font,
		size: 1.0,
		height: 0.1,
		curveSegments: 12,
		bevelEnabled: true,
		bevelThickness: 0.02,
		bevelSize: 0.05,
		bevelOffset: 0,
		bevelSegments: 5,
	});

	textGeometry.computeBoundingBox();
	const center = textGeometry.boundingBox.getCenter(new THREE.Vector3());
	textGeometry.translate(-center.x, -center.y, -center.z);

	const textMaterial = new THREE.MeshStandardMaterial({
		color: 0xffff00,
		emissive: 0x444400,
	});

	const textMesh = new THREE.Mesh(textGeometry, textMaterial);

	return textMesh;
}

function switchCarModel() {
	cars[currentCarIndex].visible = false;
	currentCarIndex = (currentCarIndex + 1) % cars.length;
	cars[currentCarIndex].visible = true;
	addLabelsToCar(cars[currentCarIndex], `car${currentCarIndex + 1}`);
	addCarNameLabel(cars[currentCarIndex], `car${currentCarIndex + 1}`);
	resetCarPosition(cars[currentCarIndex]);
	updateCameraPosition();
}

document.getElementById('switchCarButton').addEventListener('click', switchCarModel);

window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
	const containerWidth = container.clientWidth;
	const containerHeight = container.clientHeight;

	camera.aspect = containerWidth / containerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(containerWidth, containerHeight);
}

function updateCameraPosition() {
	const currentCar = cars[currentCarIndex];
	const carPosition = new THREE.Vector3();
	currentCar.getWorldPosition(carPosition);
	const desiredCameraPosition = carPosition.clone().add(cameraOffset);
	camera.position.lerp(desiredCameraPosition, 0.1); // Плавное движение камеры
	controls.target.copy(carPosition);
}

function resetCarPosition(car) {
	car.position.z = 0;
	textureOffset = 0;
	groundTexture.offset.y = textureOffset;
}

let textureOffset = 0;
const maxZ = 300; // Максимальное значение Z, после которого машина сбрасывается
const minZ = 0; // Минимальное значение Z

function animateScene() {
	requestAnimationFrame(animateScene);
	controls.update();

	const currentCar = cars[currentCarIndex];
	const carKey = `car${currentCarIndex + 1}`;
	const speed = carSpeeds[carKey];

	// Перемещаем машину вперед
	currentCar.position.z += speed;

	// Обновляем смещение текстуры земли для создания эффекта движения
	textureOffset += speed * 0.05;
	groundTexture.offset.y = textureOffset;

	// Проверяем, если машина уехала за пределы, сбрасываем её позицию
	if (currentCar.position.z > maxZ) {
		resetCarPosition(currentCar);
	}

	// Обновляем позицию камеры
	const carPosition = new THREE.Vector3();
	currentCar.getWorldPosition(carPosition);
	const desiredCameraPosition = carPosition.clone().add(cameraOffset);
	camera.position.lerp(desiredCameraPosition, 0.1); // Плавное движение камеры
	controls.target.copy(carPosition);

	renderer.render(scene, camera);
}
