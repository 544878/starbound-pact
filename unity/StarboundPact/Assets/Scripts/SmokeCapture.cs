using System;
using System.IO;
using System.Linq;
using System.Collections;
using UnityEngine;

namespace Starbound {
 public partial class StarboundGame {
  IEnumerator Smoke(){var output=Path.Combine(Application.dataPath,"../QA");Directory.CreateDirectory(output);yield return new WaitForSeconds(2);
   foreach(string page in new[]{"home","growth","summon","formation","activities","tasks","story","tower","inventory","homestead","settings"}){
    Go(page);yield return new WaitForSeconds(.4f);yield return new WaitForEndOfFrame();ScreenCapture.CaptureScreenshot(Path.Combine(output,page+".png"));yield return new WaitForSeconds(.25f);
   }
   foreach(string mode in new[]{"currency","duel"}){activity=mode;Go("activities");yield return new WaitForSeconds(.3f);yield return new WaitForEndOfFrame();ScreenCapture.CaptureScreenshot(Path.Combine(output,mode+".png"));yield return new WaitForSeconds(.2f);}
   battle=new AstralBattle(S.formation.Where(id=>id!=null).Select(game.Character),S.weapons,C);Go("battle");yield return new WaitForSeconds(1);yield return new WaitForEndOfFrame();ScreenCapture.CaptureScreenshot(Path.Combine(output,"battle.png"));yield return new WaitForSeconds(.3f);
   auto=true;float until=Time.time+120;while(battle.outcome=="playing"&&Time.time<until)yield return null;yield return new WaitForSeconds(1);yield return new WaitForEndOfFrame();ScreenCapture.CaptureScreenshot(Path.Combine(output,"battle-result.png"));yield return new WaitForSeconds(.4f);File.WriteAllText(Path.Combine(output,"smoke-result.txt"),"Battle: "+battle.outcome+"\nRound: "+battle.round+"\nDamage: "+battle.totalDamage);Application.Quit(battle.outcome=="win"?0:1);
  }
 }
}
