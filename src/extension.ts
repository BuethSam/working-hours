import * as vscode from 'vscode';
import DateTime from "typescript-dotnet-umd/System/Time/DateTime";
import ClockTime from "typescript-dotnet-umd/System/Time/ClockTime";
import TimeSpan from 'typescript-dotnet-umd/System/Time/TimeSpan';
import TimeUnit from 'typescript-dotnet-umd/System/Time/TimeUnit';

let myStatusBarItem: vscode.StatusBarItem;
let interval: NodeJS.Timer;
let gcontext: vscode.ExtensionContext;

let ende: TimeSpan = new TimeSpan(0);

function start(): TimeSpan {
	return ende.add(new TimeSpan(arbeitszeit().milliseconds * -1, TimeUnit.Milliseconds));
}

let settings = vscode.workspace.getConfiguration("timeout");

function arbeitszeit(): TimeSpan {
	return TimeSpan.fromHours(settings.worktime + settings.breaktime);
}

export function activate(context: vscode.ExtensionContext) {
	gcontext = context;
	updateSettings();
	ende = new TimeSpan(0);

	myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	myStatusBarItem.command = 'timeout.stop';

	context.subscriptions.push(myStatusBarItem);

	let tende: TimeSpan | undefined = context.globalState.get("ende");

	if (tende) ende = new TimeSpan(tende.milliseconds, TimeUnit.Milliseconds);

	if (settings.autostart && ende.ticks !== 0) {
		startTimeout();
	}

	let disstart = vscode.commands.registerCommand('timeout.start', () => {
		stopInterval();
		vscode.window.showInputBox({ prompt: "Geben sie die Startzeit ein. ", placeHolder: new Date().toLocaleTimeString() }).then((value) => {
			if (value === '') ende = arbeitszeit().add(DateTime.now.timeOfDay);
			else ende = arbeitszeit().add(new DateTime(new Date().toDateString() + ' ' + value).timeOfDay);
			startTimeout();
		});
	});

	let disset = vscode.commands.registerCommand('timeout.set', () => {
		stopInterval();
		vscode.window.showInputBox({ prompt: "Geben Sie die Endzeit ein. " }).then((value) => {
			if (value !== '') {
				ende = new TimeSpan(0).add(new DateTime(new Date().toDateString() + ' ' + value).timeOfDay);
				startTimeout();
			}
			else {
				vscode.window.showWarningMessage("Bitte geben Sie eine Endzeit ein! ");
			}
		});
	});

	let disstartlast = vscode.commands.registerCommand('timeout.startlast', () => {
		if (ende.ticks !== 0) {
			startTimeout();
		}
	});

	let disstop = vscode.commands.registerCommand('timeout.stop', () => {
		stopInterval();
	});


	context.subscriptions.push(disstart);
	context.subscriptions.push(disstartlast);
	context.subscriptions.push(disset);
	context.subscriptions.push(disstop);

}

// this method is called when your extension is deactivated
export function deactivate() { }

function startTimeout() {
	gcontext.globalState.update("start", start);
	gcontext.globalState.update("ende", ende);
	myStatusBarItem.tooltip = TimeSpanToString(start()) + " - " + TimeSpanToString(ende);
	interval = setInterval(updateStatusBarItem, 1000);
	updateStatusBarItem();
	myStatusBarItem.show();
}

function updateSettings() {
	settings = vscode.workspace.getConfiguration("timeout");
}

function updateStatusBarItem(): void {
	let now = DateTime.now.timeOfDay;
	var t = new TimeSpan(ende.getTotalMilliseconds() - now.getTotalMilliseconds());
	switch (t.direction) {
		case +1:
			myStatusBarItem.text = "T-" + TimeSpanToString(t);
			myStatusBarItem.color = 'statusBar.foreground';
			break;
		default:
			myStatusBarItem.text = "ENDE";
			myStatusBarItem.color = 'red';
			break;
	}
}

function stopInterval() {
	if (interval !== undefined) clearInterval(interval);
	myStatusBarItem.hide();
}

function TimeSpanToString(t: TimeSpan | ClockTime): string {
	var r: string[] = [
		Math.floor(t.getTotal(TimeUnit.Hours)).toString(),
		Math.floor(t.getTotal(TimeUnit.Minutes) - Math.floor(t.getTotal(TimeUnit.Hours)) * 60).toString(),
		Math.floor(t.getTotal(TimeUnit.Seconds) - Math.floor(t.getTotal(TimeUnit.Minutes)) * 60).toString()
	];
	r.forEach((element, index) => {
		if (element.length < 2) r[index] = '0' + element;
	});
	return r[0] + ":" + r[1] + ":" + r[2];
}
