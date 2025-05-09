import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormResultPage } from './form-result.page';

describe('FormResultPage', () => {
  let component: FormResultPage;
  let fixture: ComponentFixture<FormResultPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(FormResultPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
