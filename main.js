import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.172.0/build/three.module.js';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import TWEEN from 'https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.esm.js'; 
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';


const API_URL = "https://unefa6tosistemas2025api.onrender.com/api/articulos";
window.consultarArticulos = consultarArticulos;

// Variables globales
let scene, camera, renderer, objetos = [], raycaster, mouse, infoBox;
let objetoSeleccionado = null, gltfCamera = null;
let composer;


// Configuración de modelos
const modelosBase = "./public/models/";
const modelosFrutas = {
    "MANZANA": "manzana.gltf",
    "NARANJA": "naranja.gltf",
    "PERA": "pera.gltf",
    "PERA2": "pera.gltf",
    "LECHUGA": "lechuga.gltf",
    "GUANTES DE BOXEO": "GUANTES.gltf",
    "BARRA OLÍMPICA Y PESAS": "BARRA.gltf",
    "BALÓN DE BALONCESTO": "BALON.gltf",
    "LÁMPARAS DE MESA":"LAMPARAS.gltf",
    "JUEGO DE SÁBANAS": "sabanas.gltf",
    "OLLAS Y SARTENES": "OLLAS.gltf",
    "CONSOLA DE VIDEOJUEGOS": "consola.gltf",
    "HOME THEATHER": "HOME THEATHER.gltf",
    "SMARTPHONE":"telefono.gltf",
    "TABLET":"tablet.gltf",
    "COMPUTACIÓN": "pc.gltf",
    "HOME THEATER": "HOME THEATHER.gltf",
    "CÁMARA DIGITAL": "camara.gltf"

};

// Loaders
const loader = new GLTFLoader();
const hdrEquirect = new RGBELoader().setPath('./textures/');

// Configuración de la escena
function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    document.body.appendChild(renderer.domElement);
    
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.45;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.useLegacyLights = false;
    renderer.setClearColor(0xffffff, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Luces
    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(0, 90, 15);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
 
    directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 100;
directionalLight.shadow.camera.left = -50;
directionalLight.shadow.camera.right = 50;
directionalLight.shadow.camera.top = 50;
directionalLight.shadow.camera.bottom = -50;
    

    // Raycaster y eventos
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    window.addEventListener("click", onMouseClick, false);

    // Caja de información
    infoBox = document.createElement("div");
    infoBox.id = "info-column"; // Cambiamos a ID para el CSS
    infoBox.style.display = "none";
    document.body.appendChild(infoBox);

    // Botón de volver
    const botonVolver = document.getElementById("volver");
    botonVolver.addEventListener("click", volverACamaraInicial);

    // Cargar modelo principal
    cargarModelo("SHOP.gltf");

    // Cargar HDR
    hdrEquirect.load('/brown_photostudio_02_2k.hdr', (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.background = texture;
        scene.environment = texture;

        scene.traverse((obj) => {
            if (obj.isMesh && obj.material) {
                obj.material.envMap = texture;
                obj.material.envMapIntensity = 0.4;
                obj.material.needsUpdate = true;
            }
        });
    });

    animate();
}

// Animación
function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();

    objetos.forEach(obj => {
        obj.rotation.y += 0.01;
        if (obj && obj.userData.boton) {
            const posicionMundial = new THREE.Vector3();
            obj.getWorldPosition(posicionMundial);
            
            posicionMundial.project(gltfCamera || camera);
            
            const x = (posicionMundial.x * 0.5 + 0.5) * window.innerWidth;
            const y = (posicionMundial.y * -0.5 + 0.5) * window.innerHeight;

            obj.userData.boton.style.left = `${x}px`;
            obj.userData.boton.style.top = `${y}px`;
            
            // Ocultar botones si el objeto está detrás de la cámara
            obj.userData.boton.style.visibility = posicionMundial.z > 1 ? "hidden" : "visible";
        }
    });

    renderer.render(scene, gltfCamera || camera);
}


function crearBotonParaObjeto(objeto) {
    const boton = document.createElement("button");
    boton.innerText = objeto.userData.ARTDESCRI; // Nombre del artículo
    boton.style.position = "absolute";
    boton.style.display = "block";
    boton.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    boton.style.color = "white";
    boton.style.border = "none";
    boton.style.padding = "8px 15px";
    boton.style.borderRadius = "15px";
    boton.style.cursor = "pointer";
    boton.style.fontSize = "12px";
    boton.style.zIndex = "1000";
    boton.style.transform = "translate(-50%, -50%)";

    // Asignar un evento de clic al botón
    boton.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevenir propagación del evento
        mostrarInfoObjeto(objeto);
    });
    // Agregar el botón al DOM
    document.body.appendChild(boton);

    // Guardar una referencia al botón en el objeto
    objeto.userData.boton = boton;
}

// CARGAR MODELO DE LA ESCENA
function cargarModelo(nombreArchivo) {
    loader.load(`${modelosBase}${nombreArchivo}`, (gltf) => {
        const modelo = gltf.scene;
        scene.add(modelo);
        // Habilitar sombras para todas las mallas del modelo
        modelo.traverse((child) => {
            if (child.isMesh) {
               
                child.receiveShadow = true; 
            }

    
            if (child.isCamera) {
                console.log("📷 Cámara encontrada en GLTF:", child);
                gltfCamera = child;
            }
        });

        if (gltfCamera) {
            renderer.render(scene, gltfCamera);
        } else {
            console.warn("⚠ No se encontró una cámara en el GLTF. Usando cámara predeterminada.");
        }
    }, undefined, (error) => {
        console.error("Error al cargar el modelo:", error);
    });
}



//CONSULTA API
async function consultarArticulos() {
    const cedula = document.getElementById("cedula").value;
    const categoria = document.getElementById("categoria").value;

    if (!cedula) return alert("Ingrese la cédula.");

    try {
        const respuesta = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ "ALUMNO": cedula, "ARTCATEGO": categoria })
        });

        const resultado = await respuesta.json();
        if (!resultado.Resul) return alert(resultado.error);

        limpiarEscena();
        resultado.data.forEach(async (articulo, index) => {
            await agregarModelo(index, articulo);
        });

    } catch (error) {
        console.error("Error en la consulta", error);
    }
}

const zona = {
    ancho: 32, 
    largo: 2, 
    posicion: new THREE.Vector3(0, 17, 0) 
};

let espaciadoX, espaciadoZ;

// AGREGAR MODELO DE PRODUCTOS
async function agregarModelo(index, articulo) {
    const nombreModelo = articulo.ARTDESCRI.toUpperCase();

    try {
        const gltf = await loader.loadAsync(`${modelosBase}${modelosFrutas[nombreModelo]}`);
        const modelo = gltf.scene;
        modelo.updateMatrixWorld(true);

        const posX = (index * espaciadoX) - (zona.ancho / 2) + (espaciadoX / 2);
        const posZ = 0; 
        modelo.position.set(posX, 16, posZ);
            
       
        modelo.userData = { ...articulo, posicionOriginal: modelo.position.clone() };

        modelo.traverse(obj => {
            if (obj.isMesh) {
                obj.castShadow = true;
                obj.receiveShadow = true;
                obj.userData = modelo.userData;
                obj.geometry.computeBoundingSphere();

                if (!obj.geometry.boundingBox) {
                    obj.geometry.computeBoundingBox();
                }
            }
        });



        scene.add(modelo);
        objetos.push(modelo);
        crearBotonParaObjeto(modelo);
        actualizarEspaciado();
        console.log("Nombre buscado:", nombreModelo);
        console.log("Modelos disponibles:", Object.keys(modelosFrutas));

    } catch (error) {
        console.error(`Error cargando modelo para ${nombreModelo}:`, error);
       /*  const geometry = new THREE.BoxGeometry();
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(index * 10 - 12, 16, 0);
        cube.userData = { ...articulo, posicionOriginal: cube.position.clone() };
        scene.add(cube);
        objetos.push(cube); */
    }
}


//CONTROLADOR PARA LA POSICION EN DONDE SE MUESTRAN LOS OBJETOS
function actualizarEspaciado() {
    const numModelos = objetos.length;
    espaciadoX = zona.ancho / numModelos;
    espaciadoZ = zona.largo / numModelos;

    
    objetos.forEach((obj, index) => {
        const posX = (index * espaciadoX) - (zona.ancho / 2) + (espaciadoX / 2);
        obj.position.set(posX, 16, -2);
    });
}



function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, gltfCamera || camera);
    const intersects = raycaster.intersectObjects(objetos, true);

    if (intersects.length > 0) {
        objetoSeleccionado = intersects[0].object;
        while (objetoSeleccionado.parent && objetoSeleccionado.parent !== scene) {
            objetoSeleccionado = objetoSeleccionado.parent;
        }
        mostrarInfoObjeto(objetoSeleccionado);
    } else {
        console.log("No hay intersecciones. Posición cámara:", camera.position);
    }

  
}



function mostrarInfoObjeto(objeto) {
    objetos.forEach(obj => obj.visible = obj === objeto);
    document.getElementById("volver").style.display = "block";

    objetos.forEach(obj => {
        if (obj.userData.boton) {
            obj.userData.boton.style.display = "none";
        }
    });

    new TWEEN.Tween(gltfCamera.position)
        .to({ x: objeto.position.x, y: objeto.position.y + 1, z: objeto.position.z + 27 }, 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
  
    const articulo = objeto.userData;
    infoBox.innerHTML = `
    <h3>${articulo.ARTDESCRI}</h3>
    <p><strong>Código:</strong> ${articulo.ARTNUMERO}</p>
    <p><strong>Precio:</strong> $${articulo.ARTPRECIO}</p>
    <!-- Agrega más campos según necesites -->
`;
infoBox.classList.add('show');
infoBox.style.display = "block";
}


function volverACamaraInicial() {


    objetos.forEach(obj => {
        obj.visible = true; 

        
        if (obj.userData.boton) {
            obj.userData.boton.style.display = "block";
        }
    });

    
    if (objetoSeleccionado) {
        new TWEEN.Tween(objetoSeleccionado.position)
            .to(objetoSeleccionado.userData.posicionOriginal, 1000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
    }

    
    new TWEEN.Tween(gltfCamera.position)
        .to({ x: 0.27, y: 19.8, z: 49 }, 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();

   
    infoBox.classList.remove('show');
    setTimeout(() => { infoBox.style.display = "none"; }, 300);
    document.getElementById("volver").style.display = "none";

    
    objetoSeleccionado = null;
}

function limpiarEscena() {
    objetos.forEach(obj => {
        
        if (obj.userData.boton) {
            document.body.removeChild(obj.userData.boton);
        }
        scene.remove(obj);
    });
           

    objetos = [];
    infoBox.style.display = "none";
}

init();

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (gltfCamera) {
        gltfCamera.aspect = window.innerWidth / window.innerHeight;
        gltfCamera.updateProjectionMatrix();
    }
});
