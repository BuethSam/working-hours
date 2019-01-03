import * as vscode from 'vscode';
import DateTime from "typescript-dotnet-umd/System/Time/DateTime";
import ClockTime from "typescript-dotnet-umd/System/Time/ClockTime";
import TimeSpan from 'typescript-dotnet-umd/System/Time/TimeSpan';
import TimeUnit from 'typescript-dotnet-umd/System/Time/TimeUnit';

let myStatusBarItem: vscode.StatusBarItem;
let interval: NodeJS.Timer;

let start = new ClockTime(0);

function arbeitszeit(): TimeSpan {
	return TimeSpan.fromHours(7.6 + 0.5);
}

function ende(): TimeSpan {
	return arbeitszeit().add(start);
}

export function activate(context: vscode.ExtensionContext) {

	let disset = vscode.commands.registerCommand('timeout.set', () => {
		if (interval !== null) stopInterval();

		vscode.window.showInputBox({}).then((value) => {
			if (value !== '') {
				start = new DateTime(new Date().toDateString() + ' ' + value).timeOfDay;
				myStatusBarItem.tooltip = TimeSpanToString(start) + " - " + TimeSpanToString(ende());
				interval = setInterval(updateStatusBarItem, 1000);
				myStatusBarItem.show();
			}
			else stopInterval();
		});
	});

	let disclear = vscode.commands.registerCommand('timeout.clear', () => {
		if (interval !== null) stopInterval();
	});

	context.subscriptions.push(disset);
	context.subscriptions.push(disclear);


	myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	myStatusBarItem.command = 'timeout.set';

	context.subscriptions.push(myStatusBarItem);
}

// this method is called when your extension is deactivated
export function deactivate() { }


function updateStatusBarItem(): void {
	let now = DateTime.now.timeOfDay;
	var t = new TimeSpan(ende().getTotalMilliseconds() - now.getTotalMilliseconds());
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
	clearInterval(interval);
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
