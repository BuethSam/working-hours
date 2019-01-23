import * as vscode from 'vscode';
import DateTime from "typescript-dotnet-umd/System/Time/DateTime";
import ClockTime from "typescript-dotnet-umd/System/Time/ClockTime";
import TimeSpan from 'typescript-dotnet-umd/System/Time/TimeSpan';
import TimeUnit from 'typescript-dotnet-umd/System/Time/TimeUnit';

let myStatusBarItem: vscode.StatusBarItem;
var interval: NodeJS.Timer;
var Settings: SettingsClass;

class SettingsClass {
	private context: vscode.ExtensionContext;
	private pende: TimeSpan | undefined;
	constructor(_context: vscode.ExtensionContext) {
		this.context = _context;
		this.pende = this.context.globalState.get("ende");
	}

	public get ende(): TimeSpan | undefined {
		if (!this.pende) return undefined;
		return new TimeSpan(this.pende!.ticks, TimeUnit.Ticks);
	}

	public set ende(v: TimeSpan | undefined) {
		this.context.globalState.update("ende", v);
		this.pende = v;
	}

	public get start(): TimeSpan | undefined {
		if (!this.ende) return undefined;
		return this.ende.add(new TimeSpan(this.arbeitszeit.milliseconds * -1, TimeUnit.Milliseconds));
	}

	public get arbeitszeit(): TimeSpan {
		return TimeSpan.fromMinutes(this.workTime * 60 + this.breakTime);
	}

	private get config(): vscode.WorkspaceConfiguration {
		return vscode.workspace.getConfiguration("working-hours");
	}

	public get autostart(): boolean {
		return this.config.get<boolean>("autostart")!;
	}

	public get workTime(): number {
		return this.config.get<number>("workTime")!;
	}

	public get breakTime(): number {
		return this.config.get<number>("breakTime")!;
	}

	public get rest(): TimeSpan {
		if (!Settings.ende) return TimeSpan.zero;
		return new TimeSpan(Settings.ende.getTotalMilliseconds() - DateTime.now.timeOfDay.getTotalMilliseconds());
	}

}

export function activate(context: vscode.ExtensionContext) {
	Settings = new SettingsClass(context);

	myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	myStatusBarItem.command = 'working-hours.pause';

	context.subscriptions.push(myStatusBarItem);

	if (Settings.autostart && Settings.ende && Settings.rest.direction === +1) {
		startTimeout();
	}

	let dissetstart = vscode.commands.registerCommand('working-hours.setstart', () => {
		stopInterval();
		vscode.window.showInputBox({ prompt: "Geben sie die Startzeit ein. ", placeHolder: new Date().toLocaleTimeString() }).then((value) => {
			if (value === '') Settings.ende = Settings.arbeitszeit.add(DateTime.now.timeOfDay);
			else Settings.ende = Settings.arbeitszeit.add(new DateTime(new Date().toDateString() + ' ' + value).timeOfDay);
			startTimeout();
		});
	});

	let dissetend = vscode.commands.registerCommand('working-hours.setend', () => {
		stopInterval();
		vscode.window.showInputBox({ prompt: "Geben Sie die Endzeit ein. " }).then((value) => {
			if (value !== '') {
				Settings.ende = new TimeSpan(0).add(new DateTime(new Date().toDateString() + ' ' + value).timeOfDay);
				startTimeout();
			}
			else {
				vscode.window.showWarningMessage("Bitte geben Sie eine Endzeit ein! ");
			}
		});
	});

	let disresume = vscode.commands.registerCommand('working-hours.resume', () => {
		if (Settings.ende) {
			startTimeout();
		}
		else vscode.window.showWarningMessage("Countdown nicht gesetzt! ");
	});

	let dispause = vscode.commands.registerCommand('working-hours.pause', () => {
		stopInterval();
		myStatusBarItem.hide();
	});

	let disclear = vscode.commands.registerCommand('working-hours.clear', () => {
		stopInterval();
		myStatusBarItem.hide();
		Settings.ende = undefined;
	});


	context.subscriptions.push(dissetstart);
	context.subscriptions.push(dissetend);
	context.subscriptions.push(disresume);
	context.subscriptions.push(dispause);
	context.subscriptions.push(disclear);

}

// this method is called when your extension is deactivated
export function deactivate() { }

function startTimeout() {
	myStatusBarItem.tooltip = TimeSpanToString(Settings.start!) + " - " + TimeSpanToString(Settings.ende!);
	interval = setInterval(updateStatusBarItem, 1000);
	updateStatusBarItem();
	myStatusBarItem.show();
}


function updateStatusBarItem(): void {
	var t = Settings.rest;
	if (t.ticks <= 0) stopInterval();
	switch (t.direction) {
		case +1:
			myStatusBarItem.text = "$(watch) T-" + TimeSpanToString(t);
			myStatusBarItem.color = 'statusBar.foreground';
			break;
		default:
			myStatusBarItem.text = "$(check) ENDE";
			myStatusBarItem.color = 'lime';
			break;
	}
}

function stopInterval() {
	if (interval !== undefined) clearInterval(interval);
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
