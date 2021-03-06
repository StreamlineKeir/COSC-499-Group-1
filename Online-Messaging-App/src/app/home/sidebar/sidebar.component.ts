import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { AuthenticationService } from "../../shared/authentication.service";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import {
    APIConfig,
    ChannelIdAndType,
    ChannelObject,
    Constants,
    NewUsersSubbedChannelObject,
    NotificationObject,
    ProfileObject,
    UserChannelObject,
    UserChannelObjectWithNotficationCount,
    UserObject
} from "../../shared/app-config";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { CreateChannelComponent } from "./createChannel/create-channel.component";
import { CookieService } from "ngx-cookie-service";
import { UnsubscribeConfirmComponent } from "./unsubscribe-confirm/unsubscribe-confirm.component";
import { NotificationService } from "../../shared/notification.service";
import { CognitoIdToken } from "amazon-cognito-identity-js";

const PRIVATE: string = "private";
const PUBLIC: string = "public";
const FRIEND: string = "friend";
const CHECKED: string = "checked";
const SELECTED: string = "selected";
const LAX = "Lax";

const NOTIFICATIONS_URI = "/notifications";
const CHANNEL_ID_URI = "/channelId/";
const USERNAME_URI = "/username/";

const DIALOG_WIDTH = "80%";
const DIALOG_CLASS = "dialog-class";

const MAX_FRIEND_CHANNEL_LENGTH = 2;

const CHANNELS_URI = "/channels/";

const MESSAGE_NOTIFICATION_BROADCAST = "messageNotificationBroadcast";
const NOTIFICATION_TYPE_MESSAGE = "message";

const BANNED_ACCESS_MESSAGE = "You cannot access a channel in which you are banned.";

@Component({
    selector: "app-sidebar",
    templateUrl: "./sidebar.component.html",
    styleUrls: ["./sidebar.component.scss"]
})
export class SidebarComponent implements OnInit {
    publicChannels: Array<UserChannelObjectWithNotficationCount> = [];
    privateChannels: Array<UserChannelObjectWithNotficationCount> = [];
    friendsChannels: Array<UserChannelObjectWithNotficationCount> = [];
    userSubscribedChannels = [];
    @Input() userList: Array<UserObject>;
    @Input() currentUserProfile: ProfileObject;
    @Output() channelEvent = new EventEmitter<ChannelObject>();
    @Output() newChannelEvent = new EventEmitter<ChannelObject>();
    @Output() switchEvent = new EventEmitter<string>();
    @Output() profileViewEvent = new EventEmitter<string>();
    @Output() newUserSubbedChannelEvent = new EventEmitter<NewUsersSubbedChannelObject>();
    @Output() goToChannelFromNotificationEvent = new EventEmitter();
    publicChannelSelect: boolean;
    privateChannelSelect: boolean;
    friendChannelSelect: boolean;
    list;
    chatBox = "chatBox";
    settings = "settings";
    selectedChannelId: string;
    channelBrowser = "channelBrowser";
    profile = "profile";
    private usersAPI: string = APIConfig.usersAPI;
    private channelsURL: string = APIConfig.channelsAPI;
    private notificationsAPI: string = APIConfig.notificationsAPI;

    constructor(
        private http: HttpClient,
        private cookieService: CookieService,
        private auth: AuthenticationService,
        private dialog: MatDialog,
        private notificationService: NotificationService
    ) {
    }

    private _notificationChannel: ChannelIdAndType;

    @Input()
    public set notificationChannel(value: ChannelIdAndType) {
        if (value) {
            this._notificationChannel = value;
            this.selectChannel(value.channelId, value.type);
            this.switchDisplay(this.chatBox);
            if (value.type == PUBLIC) {
                this.selectPublicChannel();
            } else if (value.type == PRIVATE) {
                this.selectPrivateChannel();
            } else if (value.type == FRIEND) {
                this.selectFriend();
            }
            this.newUserSubbedChannelEvent.emit({
                channelId: value.channelId,
                username: this.currentUserProfile.username,
                joined: true
            });
        }
    }

    private _newBannedUser: UserChannelObject;

    public get newBannedUser(): UserChannelObject {
        return this._newBannedUser;
    }

    @Input()
    public set newBannedUser(user: UserChannelObject) {
        if (user) {
            this._newBannedUser = user;
            this.getSubscribedChannels(true).catch((err) => {
                console.error(err);
            });
        }
    }

    private _subbedChannel: ChannelObject;

    public get subbedChannel(): ChannelObject {
        return this._subbedChannel;
    }

    @Input()
    public set subbedChannel(value: ChannelObject) {
        if (value) {
            this.setNewChannel(value);
            this.newUserSubbedChannelEvent.emit({
                channelId: value.channelId,
                username: this.currentUserProfile.username,
                joined: true
            });
        }
    }

    private _channelToGoToFromNotification: ChannelIdAndType;

    public get channelToGoToFromNotification(): ChannelIdAndType {
        return this._channelToGoToFromNotification;
    }

    @Input()
    public set channelToGoToFromNotification(value: ChannelIdAndType) {
        if (value) {
            this._channelToGoToFromNotification = value;
            this.selectChannel(value.channelId, value.type);
            this.switchDisplay(this.chatBox);
            if (value.type == PUBLIC) {
                this.selectPublicChannel();
            } else if (value.type == PRIVATE) {
                this.selectPrivateChannel();
            } else if (value.type == FRIEND) {
                this.selectFriend();
            }
        }
    }

    public ngOnInit(): void {
        if (this.auth.isLoggedIn()) {
            let user: string = this.auth.getAuthenticatedUser().getUsername();
            this.getSubscribedChannels(false)
                .then(() => {
                    if (this.cookieService.get(user)) {
                        this.switchDisplay(this.chatBox);
                        this.selectChannel(
                            JSON.parse(this.cookieService.get(user)).lastChannelID,
                            JSON.parse(this.cookieService.get(user)).lastChannelType
                        );
                        if (JSON.parse(this.cookieService.get(user)).lastChannelType == FRIEND) {
                            this.selectFriend();
                        }
                        if (JSON.parse(this.cookieService.get(user)).lastChannelType == PRIVATE) {
                            this.selectPrivateChannel();
                        }
                        if (JSON.parse(this.cookieService.get(user)).lastChannelType == PUBLIC) {
                            this.selectPublicChannel();
                        }
                    } else if (this.publicChannels.length == 0) {
                        this.switchDisplay(this.channelBrowser);
                        this.selectPublicChannel();
                    } else {
                        this.selectPublicChannel();
                        this.selectChannel(this.publicChannels[0].channelId, PUBLIC);
                    }
                })
                .catch((err) => {
                    console.error(err);
                });

            this.notificationService.addSocketListener(
                MESSAGE_NOTIFICATION_BROADCAST,
                (messageNotification: NotificationObject) => {
                    if (
                        messageNotification.type == NOTIFICATION_TYPE_MESSAGE &&
                        messageNotification.username == this.currentUserProfile.username &&
                        messageNotification.channelId != this.selectedChannelId
                    ) {
                        if (messageNotification.channelType == PUBLIC) {
                            this.publicChannels[
                                this.findIndexOfChannel(this.publicChannels, messageNotification.channelId)
                                ].notificationCount += 1;
                        } else if (messageNotification.channelType == PRIVATE) {
                            this.privateChannels[
                                this.findIndexOfChannel(this.privateChannels, messageNotification.channelId)
                                ].notificationCount += 1;
                        } else if (messageNotification.channelType == FRIEND) {
                            this.friendsChannels[
                                this.findIndexOfChannel(this.friendsChannels, messageNotification.channelId)
                                ].notificationCount += 1;
                        }
                    }
                }
            );
        }
    }

    public getSubscribedChannels(banFlag: boolean): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.auth.getCurrentSessionId().subscribe(
                (data: CognitoIdToken) => {
                    let httpHeaders = {
                        headers: new HttpHeaders({
                            "Content-Type": "application/json",
                            Authorization: "Bearer " + data.getJwtToken()
                        })
                    };

                    this.http
                        .get(
                            this.usersAPI + this.auth.getAuthenticatedUser().getUsername() + Constants.CHANNELS_PATH,
                            httpHeaders
                        )
                        .subscribe(
                            (data: Array<UserChannelObject>) => {
                                this.publicChannels = [];
                                this.privateChannels = [];
                                this.friendsChannels = [];
                                this.userSubscribedChannels = data;
                                if (this.userSubscribedChannels.length > 0 && banFlag == false) {
                                    this.channelEvent.emit(this.userSubscribedChannels[0]);
                                    this.userSubscribedChannels[0][SELECTED] = true;
                                } else if (this.userSubscribedChannels.length > 0) {
                                    for (let user of this.userSubscribedChannels) {
                                        if (user.channelId == this.selectedChannelId) {
                                            user[SELECTED] = true;
                                        }
                                    }
                                }
                                for (let i = 0; i < data.length; i++) {
                                    let item = data[i];
                                    item.notificationCount = 0;
                                    if (item.channelType == PUBLIC) {
                                        this.publicChannels.push(item);
                                    } else if (item.channelType == PRIVATE) {
                                        this.privateChannels.push(item);
                                    } else {
                                        this.friendsChannels.push(item);
                                    }

                                    this.getChannelNotifications(item.channelId)
                                        .then((notificationData: Array<NotificationObject>) => {
                                            for (let notification of notificationData) {
                                                if (
                                                    notification.type == NOTIFICATION_TYPE_MESSAGE &&
                                                    notification.username == this.currentUserProfile.username
                                                ) {
                                                    if (notification.channelType == PUBLIC) {
                                                        let index = this.findIndexOfChannel(
                                                            this.publicChannels,
                                                            notification.channelId
                                                        );
                                                        if (!this.publicChannels[index].selected) {
                                                            this.publicChannels[index].notificationCount += 1;
                                                        }
                                                    } else if (notification.channelType == PRIVATE) {
                                                        let index = this.findIndexOfChannel(
                                                            this.privateChannels,
                                                            notification.channelId
                                                        );
                                                        if (!this.privateChannels[index].selected) {
                                                            this.privateChannels[index].notificationCount += 1;
                                                        }
                                                    } else if (notification.channelType == FRIEND) {
                                                        let index = this.findIndexOfChannel(
                                                            this.friendsChannels,
                                                            notification.channelId
                                                        );
                                                        if (!this.friendsChannels[index].selected) {
                                                            this.friendsChannels[index].notificationCount += 1;
                                                        }
                                                    }
                                                }
                                            }
                                            if (i == data.length - 1) {
                                                resolve();
                                            } else if (data.length == 0) {
                                                resolve();
                                            }
                                        })
                                        .catch((err) => {
                                            console.error(err);
                                        });
                                }
                                resolve();
                            },
                            (err) => {
                                console.error(err);
                                reject(err);
                            }
                        );
                },
                (err) => {
                    console.error(err);
                    reject(err);
                }
            );
        });
    }

    public parseFriendChannelName(channelName: string): string {
        let users = channelName.split(Constants.DASH, MAX_FRIEND_CHANNEL_LENGTH);
        if (users[0] == this.auth.getAuthenticatedUser().getUsername()) return users[1];
        else return users[0];
    }

    public selectPublicChannel(): void {
        this.publicChannelSelect = true;
        this.privateChannelSelect = false;
        this.friendChannelSelect = false;
        let publicElem: Element = document.getElementsByClassName(PUBLIC)[0];
        let privateElem: Element = document.getElementsByClassName(PRIVATE)[0];
        let friendElem: Element = document.getElementsByClassName(FRIEND)[0];

        if (publicElem) {
            publicElem.classList.add(CHECKED);
            privateElem.classList.remove(CHECKED);
            friendElem.classList.remove(CHECKED);
        }
    }

    public selectPrivateChannel(): void {
        this.publicChannelSelect = false;
        this.privateChannelSelect = true;
        this.friendChannelSelect = false;
        let publicElem: Element = document.getElementsByClassName(PUBLIC)[0];
        let privateElem: Element = document.getElementsByClassName(PRIVATE)[0];
        let friendElem: Element = document.getElementsByClassName(FRIEND)[0];

        if (privateElem) {
            publicElem.classList.remove(CHECKED);
            privateElem.classList.add(CHECKED);
            friendElem.classList.remove(CHECKED);
        }
    }

    public selectFriend(): void {
        this.publicChannelSelect = false;
        this.privateChannelSelect = false;
        this.friendChannelSelect = true;
        let publicElem: Element = document.getElementsByClassName(PUBLIC)[0];
        let privateElem: Element = document.getElementsByClassName(PRIVATE)[0];
        let friendElem: Element = document.getElementsByClassName(FRIEND)[0];

        if (friendElem) {
            publicElem.classList.remove(CHECKED);
            privateElem.classList.remove(CHECKED);
            friendElem.classList.add(CHECKED);
        }
    }

    public selectChannel(id: string, type: string) {
        this.selectedChannelId = id;
        this.userSubscribedChannels.forEach((item: UserChannelObject) => {
            if (item.channelId == id) {
                this.channelEvent.emit({
                    channelId: item.channelId,
                    channelName: item.channelName,
                    channelType: item.channelType,
                    channelDescription: null,
                    selected: null,
                    filtered: null
                });
                item[SELECTED] = true;
                if (type == PUBLIC) {
                    this.publicChannels[this.findIndexOfChannel(this.publicChannels, id)].notificationCount = 0;
                } else if (type == PRIVATE) {
                    this.privateChannels[this.findIndexOfChannel(this.privateChannels, id)].notificationCount = 0;
                } else if (type == FRIEND) {
                    this.friendsChannels[this.findIndexOfChannel(this.friendsChannels, id)].notificationCount = 0;
                }

                this.deleteMessageNotifications(id);

                this.cookieService.set(
                    this.auth.getAuthenticatedUser().getUsername(),
                    JSON.stringify({
                        lastChannelID: id,
                        lastChannelType: type
                    }),
                    null,
                    null,
                    null,
                    null,
                    LAX
                );
            } else {
                item[SELECTED] = false;
            }
        });
    }

    public createChannel(): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = true;
        dialogConfig.autoFocus = true;
        dialogConfig.panelClass = DIALOG_CLASS;
        dialogConfig.data = this.currentUserProfile;
        let dialogRef = this.dialog.open(CreateChannelComponent, dialogConfig);
        dialogRef.afterClosed().subscribe((result: ChannelObject) => {
            if (result) {
                this.newChannelEvent.emit({
                    channelId: result.channelId,
                    channelType: result.channelType,
                    channelName: result.channelName,
                    channelDescription: result.channelDescription,
                    selected: true,
                    filtered: null
                });
                this.userSubscribedChannels.push(result);
                if (result.channelType == PUBLIC) {
                    this.publicChannels.push(result);
                    this.selectPublicChannel();
                } else if (result.channelType == PRIVATE) {
                    this.privateChannels.push(result);
                    this.selectPrivateChannel();
                } else {
                    this.friendsChannels.push(result);
                    this.selectFriend();
                }
                this.switchDisplay(this.chatBox);
                this.selectChannel(result.channelId, result.channelType);
            }
        });
    }

    public confirmUnsubscribe(channel: UserChannelObjectWithNotficationCount): void {
        let dialogConfig: MatDialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = true;
        dialogConfig.autoFocus = true;
        dialogConfig.width = DIALOG_WIDTH;
        dialogConfig.panelClass = DIALOG_CLASS;
        dialogConfig.data = channel;
        let dialogRef = this.dialog.open(UnsubscribeConfirmComponent, dialogConfig);
        dialogRef.afterClosed().subscribe((result: boolean) => {
            if (result) {
                this.auth.getCurrentSessionId().subscribe(
                    (data) => {
                        let httpHeaders = {
                            headers: new HttpHeaders({
                                "Content-Type": "application/json",
                                Authorization: "Bearer " + data.getJwtToken()
                            })
                        };

                        for (let i = 0; i < this.userSubscribedChannels.length; i++) {
                            if (this.userSubscribedChannels[i].channelId == channel.channelId) {
                                this.notificationService.sendNewUserLeftChannelEvent(this.userSubscribedChannels[i]);
                                this.userSubscribedChannels.splice(i, 1);
                            }
                        }
                        for (let i = 0; i < this.publicChannels.length; i++) {
                            if (this.publicChannels[i].channelId == channel.channelId) {
                                this.publicChannels.splice(i, 1);
                            }
                        }
                        for (let i = 0; i < this.privateChannels.length; i++) {
                            if (this.privateChannels[i].channelId == channel.channelId) {
                                this.privateChannels.splice(i, 1);
                            }
                        }
                        for (let i = 0; i < this.friendsChannels.length; i++) {
                            if (this.friendsChannels[i].channelId == channel.channelId) {
                                this.friendsChannels.splice(i, 1);
                            }
                        }
                        if (this.publicChannelSelect) {
                            if (this.publicChannels.length > 0) {
                                this.selectPublicChannel();
                                this.selectChannel(this.publicChannels[0].channelId, PUBLIC);
                            } else if (this.privateChannels.length > 0) {
                                this.selectPrivateChannel();
                                this.selectChannel(this.privateChannels[0].channelId, PRIVATE);
                            } else if (this.friendsChannels.length > 0) {
                                this.selectFriend();
                                this.selectChannel(this.friendsChannels[0].channelId, FRIEND);
                            } else {
                                this.selectPublicChannel();
                                this.switchDisplay(this.channelBrowser);
                                this.cookieService.delete(this.auth.getAuthenticatedUser().getUsername());
                            }
                        } else if (this.privateChannelSelect) {
                            if (this.privateChannels.length > 0) {
                                this.selectPrivateChannel();
                                this.selectChannel(this.privateChannels[0].channelId, PRIVATE);
                            } else if (this.publicChannels.length > 0) {
                                this.selectPublicChannel();
                                this.selectChannel(this.publicChannels[0].channelId, PUBLIC);
                            } else if (this.friendsChannels.length > 0) {
                                this.selectFriend();
                                this.selectChannel(this.friendsChannels[0].channelId, FRIEND);
                            } else {
                                this.selectPublicChannel();
                                this.switchDisplay(this.channelBrowser);
                                this.cookieService.delete(this.auth.getAuthenticatedUser().getUsername());
                            }
                        } else if (this.friendChannelSelect) {
                            if (this.friendsChannels.length > 0) {
                                this.selectFriend();
                                this.selectChannel(this.friendsChannels[0].channelId, FRIEND);
                            } else if (this.publicChannels.length > 0) {
                                this.selectPublicChannel();
                                this.selectChannel(this.publicChannels[0].channelId, PUBLIC);
                            } else if (this.privateChannels.length > 0) {
                                this.selectPrivateChannel();
                                this.selectChannel(this.privateChannels[0].channelId, PRIVATE);
                            } else {
                                this.selectPublicChannel();
                                this.switchDisplay(this.channelBrowser);
                                this.cookieService.delete(this.auth.getAuthenticatedUser().getUsername());
                            }
                        }

                        this.http
                            .delete(
                                this.usersAPI +
                                this.auth.getAuthenticatedUser().getUsername() +
                                CHANNELS_URI +
                                channel.channelId,
                                httpHeaders
                            )
                            .subscribe(
                                () => {
                                },
                                (err) => {
                                    console.error(err);
                                }
                            );
                    },
                    (err) => {
                        console.error(err);
                    }
                );
            }
            this.newUserSubbedChannelEvent.emit({
                channelId: channel.channelId,
                username: this.currentUserProfile.username,
                joined: false
            });
        });
    }

    public switchDisplay(value: string): void {
        this.switchEvent.emit(value);

        if (value === this.profile) {
            this.profileViewEvent.emit(this.auth.getAuthenticatedUser().getUsername());
        }
    }

    public setNewChannel(value: ChannelObject) {
        if (value) {
            this._subbedChannel = value;
            this.userSubscribedChannels.push(value);
            if (value.channelType == PUBLIC) {
                this.publicChannels.push(value);
                this.selectPublicChannel();
            } else if (value.channelType == PRIVATE) {
                this.privateChannels.push(value);
                this.selectPrivateChannel();
            } else {
                this.friendsChannels.push(value);
                this.selectFriend();
            }
            this.switchDisplay(this.chatBox);
            this.selectChannel(value.channelId, value.channelType);
        }
    }

    public handleUserClickBannedChannel(): void {
        alert(BANNED_ACCESS_MESSAGE);
    }

    private getChannelNotifications(channelId: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this.auth.getCurrentSessionId().subscribe(
                (data) => {
                    let httpHeaders = {
                        headers: new HttpHeaders({
                            "Content-Type": "application/json",
                            Authorization: "Bearer " + data.getJwtToken()
                        })
                    };

                    this.http.get(this.channelsURL + channelId + NOTIFICATIONS_URI, httpHeaders).subscribe(
                        (data: Array<NotificationObject>) => {
                            resolve(data);
                        },
                        (err) => {
                            reject(err);
                        }
                    );
                },
                (err) => {
                    reject(err);
                }
            );
        });
    }

    private findIndexOfChannel(channels: Array<UserChannelObjectWithNotficationCount>, channelId: string): number {
        for (let i = 0; i < channels.length; i++) {
            if (channels[i].channelId == channelId) {
                return i;
            }
        }
        return -1;
    }

    private deleteMessageNotifications(channelId: string): void {
        this.auth.getCurrentSessionId().subscribe(
            (data) => {
                let httpHeaders = {
                    headers: new HttpHeaders({
                        "Content-Type": "application/json",
                        Authorization: "Bearer " + data.getJwtToken()
                    })
                };

                this.http
                    .delete(
                        this.notificationsAPI +
                        CHANNEL_ID_URI +
                        channelId +
                        USERNAME_URI +
                        this.auth.getAuthenticatedUser().getUsername(),
                        httpHeaders
                    )
                    .subscribe(
                        () => {
                        },
                        (err) => {
                            console.error(err);
                        }
                    );
            },
            (err) => {
                console.error(err);
            }
        );
    }
}
