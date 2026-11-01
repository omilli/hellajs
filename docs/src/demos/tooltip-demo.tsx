import { Button } from "@components/ui/button.js";
import { Tooltip } from "@components/ui/tooltip.js";

export function TooltipDemo() {
  return (
    <>
      <div class="demo-row">
        <Tooltip content="Saves every pending change" delayDuration={100} side="top">
          <Button>Hover: top</Button>
        </Tooltip>
        <Tooltip content="Deploys the current branch" delayDuration={100} side="bottom" align="start">
          <Button variant="outline">Hover: bottom-start</Button>
        </Tooltip>
      </div>
    </>
  );
}
