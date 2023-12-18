import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "sqitch-visualizer" is now active!');

	let disposable = vscode.commands.registerCommand('sqitch-visualizer.loadSqitchPlanGraph', () => {
		// read the current file
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return; // No open text editor
		}
		const document = editor.document;
		if(document.fileName.indexOf('.plan') === -1) {
			return vscode.window.showInformationMessage('This is not a sqitch plan file');
		}
		const text = document.getText();

		// parse the file
		const lines = text.split('\n').filter(line => line.trim().length > 0 && !line.startsWith('%') && !line.startsWith('@'));
		const changes = lines.map((line) => {
			const parts = line.split(' ');
			return {
				name: parts.shift(),
				requires: parts[0].startsWith('[') ? getAllRequires(parts) : [],
				//get the description of all the parts that are after the # sybol added whit space in 1 string and remove the \r
				description: parts.slice(parts.indexOf('#') + 1).join(' ').replace('\r', '')
			};
		});
		
		// create the graph in markdown using mermaid

		const nodes = changes.map(change => {
			return {
				id: change.name,
				label: change.name,
				title: change.description
			};
		});

		const edges: {
			from: string;
			to: string | undefined;
		}[] = [];

		changes.forEach(change => {
			change.requires.forEach(require => {
				edges.push({
					from: require,
					to: change.name
				});
			});
		});

		const graph = `graph LR
		${nodes.map(node => `${node.id}[${node.label}]`).join('\n')}
		${edges.map(edge => `${edge.from} --> ${edge.to}`).join('\n')}
		`;
		
		// show the graph in a preview

		const panel = vscode.window.createWebviewPanel(
			'sqitchVisualizer',
			'Sqitch Visualizer',
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
			<script src="https://unpkg.com/mermaid@8.0.0/dist/mermaid.min.js"></script>
			<style>
			body {
			  font-family: "Open Sans", sans-serif;
			}
			pre {
			  background-color: rgb(240, 240, 240, 10);
			  padding: 20px;
			  border: 1px solid #ddd;
			  border-radius: 5px;
			}
		  </style>
		  </head>
		  <body>
			<pre class="mermaid">
				${graph}
				</pre>
				</body>
			  </html>
			`;


	});


	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}

const getAllRequires = (parts:string[]) => {
	const requires = [];
	let isRequired = false;
	for(let i = 0; i < parts.length; i++) {
		if(parts[i].startsWith('[')) {
			isRequired = true;
			requires.push(parts[i].substring(1, parts[i].length - 1));
			break;
		}
		if(parts[i].endsWith(']')) {
			isRequired = false;
			requires.push(parts[i].substring(0, parts[i].length - 1));
			break;
		}
		if(isRequired) requires.push(parts[i]);

	}
	return requires;
}