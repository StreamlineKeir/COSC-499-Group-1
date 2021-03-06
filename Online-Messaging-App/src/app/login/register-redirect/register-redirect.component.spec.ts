import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { routes } from "../../app-routing.module";

import { RegisterRedirectComponent } from "./register-redirect.component";
import { RouterTestingModule } from "@angular/router/testing";
import { MaterialModule } from "../../material/material.module";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { HomeModule } from "../../home/home.module";
import { RegisterModule } from "../../register/register.module";
import { LoginModule } from "../login.module";

describe("RegisterRedirectComponent", () => {
    let component: RegisterRedirectComponent;
    let fixture: ComponentFixture<RegisterRedirectComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            imports: [
                RouterTestingModule.withRoutes(routes),
                MaterialModule,
                ReactiveFormsModule,
                FormsModule,
                HomeModule,
                RegisterModule,
                LoginModule
            ]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(RegisterRedirectComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
