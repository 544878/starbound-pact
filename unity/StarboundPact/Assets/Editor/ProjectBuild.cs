using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace Starbound.Editor {
 [InitializeOnLoad] public static class ProjectBuild {
  static ProjectBuild(){EditorApplication.delayCall+=EnsureScene;}
  public static void EnsureScene(){if(EditorApplication.isCompiling||EditorApplication.isPlayingOrWillChangePlaymode)return;
   if(!File.Exists("Assets/Scenes/Main.unity")){
    var scene=EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);EditorSceneManager.SaveScene(scene,"Assets/Scenes/Main.unity");
   }
   EditorBuildSettings.scenes=new[]{new EditorBuildSettingsScene("Assets/Scenes/Main.unity",true)};
  }
  [MenuItem("星契纪元/打开主场景")]
  public static void Open(){EnsureScene();EditorSceneManager.OpenScene("Assets/Scenes/Main.unity");}
  [MenuItem("星契纪元/构建 Windows 游戏")]
  public static void Windows(){EnsureScene();PlayerSettings.companyName="StarboundPact";PlayerSettings.productName="星契纪元";PlayerSettings.defaultScreenWidth=1600;PlayerSettings.defaultScreenHeight=900;PlayerSettings.fullScreenMode=FullScreenMode.Windowed;PlayerSettings.resizableWindow=true;PlayerSettings.runInBackground=true;PlayerSettings.colorSpace=ColorSpace.Linear;PlayerSettings.SetScriptingBackend(UnityEditor.Build.NamedBuildTarget.Standalone,ScriptingImplementation.Mono2x);PlayerSettings.SetApiCompatibilityLevel(UnityEditor.Build.NamedBuildTarget.Standalone,ApiCompatibilityLevel.NET_Standard);
   Directory.CreateDirectory("Builds/Windows");var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions{scenes=new[]{"Assets/Scenes/Main.unity"},locationPathName="Builds/Windows/StarboundPact.exe",target=BuildTarget.StandaloneWindows64,options=BuildOptions.Development});
   if(report.summary.result!=BuildResult.Succeeded)throw new Exception("Windows build failed: "+report.summary.result);Debug.Log("STARBOUND_BUILD_SUCCESS");
  }
 }
}

