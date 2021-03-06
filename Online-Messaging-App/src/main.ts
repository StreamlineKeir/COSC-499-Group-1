import { enableProdMode } from "@angular/core";
import { platformBrowserDynamic } from "@angular/platform-browser-dynamic";

import { AppModule } from "./app/app.module";
import { environment } from "./environments/environment";

if (environment.production) {
    enableProdMode();
}

// noinspection JSUnusedLocalSymbols
platformBrowserDynamic()
    .bootstrapModule(AppModule)
    .then((success) => {
    })
    .catch((err) => console.error(err));
