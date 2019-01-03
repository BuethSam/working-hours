import * as vscode from 'vscode';
import DateTime from "typescript-dotnet-umd/System/Time/DateTime";
import ClockTime from "typescript-dotnet-umd/System/Time/ClockTime";
import TimeSpan from 'typescript-dotnet-umd/System/Time/TimeSpan';
import TimeUnit from 'typescript-dotnet-umd/System/Time/TimeUnit';

let myStatusBarItem: vscode.StatusBarItem;
let interval: NodeJS.Timer;

let start = new ClockTime(0);
let ende = new TimeSpan(0);

let settings = vscode.workspace.getConfiguration("timeout");

function arbeitszeit(): TimeSpan {
	return TimeSpan.fromHours(settings.worktime + settings.breaktime);
}

export function activate(context: vscode.ExtensionContext) {
	updateSettings();

	let disstart = vscode.commands.registerCommand('timeout.start', () => {
		stopInterval();
		vscode.window.showInputBox({ prompt: "Geben sie die Startzeit ein. ", placeHolder: new Date().toLocaleTimeString() }).then((value) => {
			if (value === '') start = DateTime.now.timeOfDay;
			else start = new DateTime(new Date().toDateString() + ' ' + value).timeOfDay;
			ende = arbeitszeit().add(start);

			myStatusBarItem.tooltip = TimeSpanToString(start) + " - " + TimeSpanToString(ende);
			interval = setInterval(updateStatusBarItem, 1000);
			updateStatusBarItem();
			myStatusBarItem.show();
		});
	});

	let disset = vscode.commands.registerCommand('timeout.set', () => {
		stopInterval();
		vscode.window.showInputBox({ prompt: "Geben Sie die Endzeit ein. " }).then((value) => {
			if (value !== '') {
				start = DateTime.now.timeOfDay;
				ende = new TimeSpan(0).add(new DateTime(new Date().toDateString() + ' ' + value).timeOfDay);
				myStatusBarItem.tooltip = TimeSpanToString(start) + " - " + TimeSpanToString(ende);
				interval = setInterval(updateStatusBarItem, 1000);
				updateStatusBarItem();
				myStatusBarItem.show();
			}
			else {
				vscode.window.showWarningMessage("Bitte geben Sie eine Endzeit ein! ");
			}
		});
	});

	let disstop = vscode.commands.registerCommand('timeout.stop', () => {
		stopInterval();
	});

	context.subscriptions.push(disstart);
	context.subscriptions.push(disset);
	context.subscriptions.push(disstop);


	myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	myStatusBarItem.command = 'timeout.stop';

	context.subscriptions.push(myStatusBarItem);
}

// this method is called when your extension is deactivated
export function deactivate() { }

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
