// Editor menu item that generates the complete demo scene programmatically.
// This avoids committing a .unity scene file that's tied to a specific Unity version.
//
// Usage: in the Unity editor, click Elevator > Create Demo Scene.

#if UNITY_EDITOR
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace ElevatorDemo.Editor
{
    public static class CreateDemoScene
    {
        [MenuItem("Elevator/Create Demo Scene")]
        public static void Create()
        {
            // Create a new empty scene.
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            // Main Camera.
            var cameraObj = new GameObject("Main Camera");
            var cam = cameraObj.AddComponent<Camera>();
            cam.orthographic = true;
            cam.orthographicSize = 10;
            cam.transform.position = new Vector3(0, 7, -10);
            cam.backgroundColor = new Color(0.1f, 0.1f, 0.12f);
            cam.clearFlags = CameraClearFlags.SolidColor;
            cameraObj.AddComponent<AudioListener>();
            cameraObj.tag = "MainCamera";

            // Directional light.
            var lightObj = new GameObject("Directional Light");
            var light = lightObj.AddComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 1f;
            lightObj.transform.rotation = Quaternion.Euler(50, -30, 0);

            // Sim Manager.
            var simObj = new GameObject("SimManager");
            var simMgr = simObj.AddComponent<ElevatorSimManager>();

            // Building Visualizer.
            var vizObj = new GameObject("BuildingVisualizer");
            var viz = vizObj.AddComponent<BuildingVisualizer>();
            viz.simManager = simMgr;

            // HUD.
            var hudObj = new GameObject("HUD");
            var hud = hudObj.AddComponent<ElevatorHUD>();
            hud.simManager = simMgr;

            // Save the scene.
            string scenePath = "Assets/Scenes/ElevatorDemo.unity";
            if (!AssetDatabase.IsValidFolder("Assets/Scenes"))
                AssetDatabase.CreateFolder("Assets", "Scenes");

            EditorSceneManager.SaveScene(scene, scenePath);
            EditorUtility.DisplayDialog(
                "Elevator Demo",
                $"Demo scene created at {scenePath}.\nPress Play to run.",
                "OK");
        }
    }
}
#endif
