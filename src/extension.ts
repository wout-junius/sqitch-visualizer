import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "sqitch-visualizer" is now active!'
  );

  let disposable = vscode.commands.registerCommand(
    "sqitch-visualizer.loadSqitchPlanGraph",
    () => {
      // read the current file
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return; // No open text editor
      }
      const document = editor.document;
      if (document.fileName.indexOf(".plan") === -1) {
        return vscode.window.showInformationMessage(
          "This is not a sqitch plan file"
        );
      }
      const text = document.getText();

      // parse the file
      const lines = text
        .split("\n")
        .filter(
          (line) =>
            line.trim().length > 0 &&
            !line.startsWith("%") &&
            !line.startsWith("@")
        );
      const changes = lines.map((line) => {
        const parts = line.split(" ");
        return {
          name: parts.shift(),
          requires: parts[0].startsWith("[") ? getAllRequires(parts) : [],
          //get the description of all the parts that are after the # sybol added whit space in 1 string and remove the \r
          description: parts
            .slice(parts.indexOf("#") + 1)
            .join(" ")
            .replace("\r", ""),
        };
      });

      // create the graph in markdown using mermaid

      const nodes = changes.map((change) => {
        return {
          id: change.name,
          label: change.name,
          title: change.description,
        };
      });

      const edges: {
        from: string;
        to: string | undefined;
      }[] = [];

      changes.forEach((change) => {
        change.requires.forEach((require) => {
          edges.push({
            from: require,
            to: change.name,
          });
        });
      });
      const graph = `graph LR
		${nodes.map((node) => `${node.id}[${node.label}]`).join("\n")}
		${edges.map((edge) => `${edge.from} --> ${edge.to}`).join("\n")}
		`;
      // show the graph in a preview

      const panel = vscode.window.createWebviewPanel(
        "sqitchVisualizer",
        "Sqitch Visualizer",
        vscode.ViewColumn.One,
        {}
      );
      panel.webview.options = {
        enableScripts: true,
      };
      panel.webview.html = `
		<!DOCTYPE html>
		<html lang="en">
		  <head>
			<meta charset="UTF-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1.0" />
			<title>Document</title>
			<script src="https://bumbu.me/svg-pan-zoom/dist/svg-pan-zoom.js"></script>
			<style>
			body {
			  font-family: "Open Sans", sans-serif;
			}
			#graphDiv {
			  background-color: rgb(240, 240, 240, 10);
			  padding: 20px;
			  border: 1px solid #ddd;
			  border-radius: 5px;
			  height: 90vh;
			  font-size: 30px !important;
			}
			#mySvgId {
				height: 100%;
			} 
		  </style>
		  </head>
		  <body>
		  <div id="graphDiv"></div>
		  <script type="module">
		  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
		  mermaid.initialize({ startOnLoad: false });
		  // Example of using the render function
		  const drawDiagram = async function () {
			const element = document.querySelector('#graphDiv');
			const graphDefinition = \`${graph}\`;
			const { svg } = await mermaid.render('mySvgId', graphDefinition);
			element.innerHTML = svg.replace(/[ ]*max-width:[ 0-9\.]*px;/i , '');
			var panZoomTiger = svgPanZoom('#mySvgId', {
			  zoomEnabled: true,
			  controlIconsEnabled: true,
			  fit: true,
			  center: true
			})
		  };
		  await drawDiagram();
		</script>
			  </html>
			`;
    }
  );

  context.subscriptions.push(disposable);
}
export function deactivate() {}

const getAllRequires = (parts: string[]) => {
  const requires = [];
  const isLastRequired = (part: string) => part.endsWith("]");
  for (let i = 0; i < parts.length; i++) {
    if (isLastRequired(parts[i])) {
      requires.push(parts[i].replace("[", "").replace("]", ""));
      break;
    }
    if (parts[i].startsWith("[")) {
      requires.push(parts[i].replace("[", "").replace("]", ""));
      continue;
    }
    requires.push(parts[i]);
  }
  return requires;
};
