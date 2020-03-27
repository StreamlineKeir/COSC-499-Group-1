import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { AuthenticationService } from "../../shared/authentication.service";
import { APIConfig, SettingsObject } from "../../shared/app-config";

const SETTINGS_URI = "/settings";
const DARK = "dark";
const LIGHT = "light";

@Component({
    selector: "app-settings",
    templateUrl: "./settings.component.html",
    styleUrls: ["./settings.component.scss"]
})
export class SettingsComponent implements OnInit {
    @Output() themeEvent = new EventEmitter<string>();
    @Output() explicitEvent = new EventEmitter<boolean>();
    @Input()
    settings: SettingsObject;
    private usersAPI: string = APIConfig.usersAPI;

    constructor(private auth: AuthenticationService, private http: HttpClient) {
    }

    ngOnInit() {
    }

    themeToggle($event): void {
        if ($event.checked) {
            this.themeEvent.emit(DARK);
            this.saveTheme(DARK);
        } else {
            this.themeEvent.emit(LIGHT);
            this.saveTheme(LIGHT);
        }
    }

    explicitToggle(event): void {
        if (event.checked) {
            this.explicitEvent.emit(true);
            this.saveExplicit(true);
        } else {
            this.explicitEvent.emit(false);
            this.saveExplicit(false);
        }
    }

    private saveExplicit(explicit: boolean) {
        this.updateSettings(this.settings.theme, explicit);
    }

    private saveTheme(themeString: string) {
        this.updateSettings(themeString, this.settings.explicit);
    }

    private updateSettings(themeString: string, explicit: boolean) {
        this.auth.getCurrentSessionId().subscribe(
            (data) => {
                let httpHeaders = {
                    headers: new HttpHeaders({
                        "Content-Type": "application/json",
                        Authorization: "Bearer " + data.getJwtToken()
                    })
                };

                let settings: SettingsObject = {
                    username: this.settings.username,
                    theme: themeString,
                    explicit: explicit
                };

                this.http
                    .put(
                        this.usersAPI + this.auth.getAuthenticatedUser().getUsername() + SETTINGS_URI,
                        settings,
                        httpHeaders
                    )
                    .subscribe(
                        (SettingsObject) => {
                            console.log("Settings updated successfully.");
                        },
                        (err) => {
                            console.log(err);
                        }
                    );
            },
            (err) => {
                console.log(err);
            }
        );
    }
}
