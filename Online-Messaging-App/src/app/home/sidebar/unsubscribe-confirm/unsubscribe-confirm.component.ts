import { Component, Inject, OnInit, Optional } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { UserChannelObjectWithNotficationCount } from "../../../shared/app-config";

@Component({
    selector: "app-unsubscribe-confirm",
    templateUrl: "./unsubscribe-confirm.component.html",
    styleUrls: ["./unsubscribe-confirm.component.scss"]
})
export class UnsubscribeConfirmComponent implements OnInit {
    channel: UserChannelObjectWithNotficationCount;

    constructor(
        public dialogRef: MatDialogRef<UnsubscribeConfirmComponent>,
        @Optional() @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.channel = data;
    }

    public ngOnInit() {
    }

    public onClose(value: boolean) {
        this.dialogRef.close(value);
    }
}
