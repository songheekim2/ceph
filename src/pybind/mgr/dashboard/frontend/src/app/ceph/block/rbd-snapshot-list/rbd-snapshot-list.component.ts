import { Component, Input, OnChanges, OnInit, TemplateRef, ViewChild } from '@angular/core';

import * as _ from 'lodash';
import * as moment from 'moment';
import { BsModalRef, BsModalService } from 'ngx-bootstrap';
import { of } from 'rxjs';

import { RbdService } from '../../../shared/api/rbd.service';
import { ConfirmationModalComponent } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { DeletionModalComponent } from '../../../shared/components/deletion-modal/deletion-modal.component';
import { CellTemplate } from '../../../shared/enum/cell-template.enum';
import { CdTableColumn } from '../../../shared/models/cd-table-column';
import { CdTableSelection } from '../../../shared/models/cd-table-selection';
import { ExecutingTask } from '../../../shared/models/executing-task';
import { FinishedTask } from '../../../shared/models/finished-task';
import { Permission } from '../../../shared/models/permissions';
import { CdDatePipe } from '../../../shared/pipes/cd-date.pipe';
import { DimlessBinaryPipe } from '../../../shared/pipes/dimless-binary.pipe';
import { AuthStorageService } from '../../../shared/services/auth-storage.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { SummaryService } from '../../../shared/services/summary.service';
import { TaskListService } from '../../../shared/services/task-list.service';
import { TaskManagerService } from '../../../shared/services/task-manager.service';
import { RbdSnapshotFormComponent } from '../rbd-snapshot-form/rbd-snapshot-form.component';
import { RbdSnapshotModel } from './rbd-snapshot.model';

@Component({
  selector: 'cd-rbd-snapshot-list',
  templateUrl: './rbd-snapshot-list.component.html',
  styleUrls: ['./rbd-snapshot-list.component.scss'],
  providers: [TaskListService]
})
export class RbdSnapshotListComponent implements OnInit, OnChanges {
  @Input()
  snapshots: RbdSnapshotModel[] = [];
  @Input()
  poolName: string;
  @Input()
  rbdName: string;
  @ViewChild('nameTpl')
  nameTpl: TemplateRef<any>;
  @ViewChild('protectTpl')
  protectTpl: TemplateRef<any>;
  @ViewChild('rollbackTpl')
  rollbackTpl: TemplateRef<any>;

  permission: Permission;

  data: RbdSnapshotModel[];

  columns: CdTableColumn[];

  modalRef: BsModalRef;

  selection = new CdTableSelection();

  builders = {
    'rbd/snap/create': (metadata) => {
      const model = new RbdSnapshotModel();
      model.name = metadata['snapshot_name'];
      return model;
    }
  };

  constructor(
    private authStorageService: AuthStorageService,
    private modalService: BsModalService,
    private dimlessBinaryPipe: DimlessBinaryPipe,
    private cdDatePipe: CdDatePipe,
    private rbdService: RbdService,
    private taskManagerService: TaskManagerService,
    private notificationService: NotificationService,
    private summaryService: SummaryService,
    private taskListService: TaskListService
  ) {
    this.permission = this.authStorageService.getPermissions().rbdImage;
  }

  ngOnInit() {
    this.columns = [
      {
        name: 'Name',
        prop: 'name',
        cellTransformation: CellTemplate.executing,
        flexGrow: 2
      },
      {
        name: 'Size',
        prop: 'size',
        flexGrow: 1,
        cellClass: 'text-right',
        pipe: this.dimlessBinaryPipe
      },
      {
        name: 'Provisioned',
        prop: 'disk_usage',
        flexGrow: 1,
        cellClass: 'text-right',
        pipe: this.dimlessBinaryPipe
      },
      {
        name: 'State',
        prop: 'is_protected',
        flexGrow: 1,
        cellClass: 'text-center',
        cellTemplate: this.protectTpl
      },
      {
        name: 'Created',
        prop: 'timestamp',
        flexGrow: 1,
        pipe: this.cdDatePipe
      }
    ];
  }

  ngOnChanges() {
    const itemFilter = (entry, task) => {
      return entry.name === task.metadata['snapshot_name'];
    };

    const taskFilter = (task) => {
      return (
        ['rbd/snap/create', 'rbd/snap/delete', 'rbd/snap/edit', 'rbd/snap/rollback'].includes(
          task.name
        ) &&
        this.poolName === task.metadata['pool_name'] &&
        this.rbdName === task.metadata['image_name']
      );
    };

    this.taskListService.init(
      () => of(this.snapshots),
      null,
      (items) => (this.data = items),
      () => (this.data = this.snapshots),
      taskFilter,
      itemFilter,
      this.builders
    );
  }

  private openSnapshotModal(taskName: string, snapName: string = null) {
    this.modalRef = this.modalService.show(RbdSnapshotFormComponent);
    this.modalRef.content.poolName = this.poolName;
    this.modalRef.content.imageName = this.rbdName;
    if (snapName) {
      this.modalRef.content.setEditing();
    } else {
      // Auto-create a name for the snapshot: <image_name>_<timestamp_ISO_8601>
      // https://en.wikipedia.org/wiki/ISO_8601
      snapName = `${this.rbdName}-${moment()
        .utc()
        .format('YYYYMMDD[T]HHmmss[Z]')}`;
    }
    this.modalRef.content.setSnapName(snapName);
    this.modalRef.content.onSubmit.subscribe((snapshotName: string) => {
      const executingTask = new ExecutingTask();
      executingTask.name = taskName;
      executingTask.metadata = {
        image_name: this.rbdName,
        pool_name: this.poolName,
        snapshot_name: snapshotName
      };
      this.summaryService.addRunningTask(executingTask);
      this.ngOnChanges();
    });
  }

  openCreateSnapshotModal() {
    this.openSnapshotModal('rbd/snap/create');
  }

  openEditSnapshotModal() {
    this.openSnapshotModal('rbd/snap/edit', this.selection.first().name);
  }

  toggleProtection() {
    const snapshotName = this.selection.first().name;
    const isProtected = this.selection.first().is_protected;
    const finishedTask = new FinishedTask();
    finishedTask.name = 'rbd/snap/edit';
    finishedTask.metadata = {
      pool_name: this.poolName,
      image_name: this.rbdName,
      snapshot_name: snapshotName
    };
    this.rbdService
      .protectSnapshot(this.poolName, this.rbdName, snapshotName, !isProtected)
      .toPromise()
      .then((resp) => {
        const executingTask = new ExecutingTask();
        executingTask.name = finishedTask.name;
        executingTask.metadata = finishedTask.metadata;
        this.summaryService.addRunningTask(executingTask);
        this.ngOnChanges();
        this.taskManagerService.subscribe(
          finishedTask.name,
          finishedTask.metadata,
          (asyncFinishedTask: FinishedTask) => {
            this.notificationService.notifyTask(asyncFinishedTask);
          }
        );
      });
  }

  _asyncTask(task: string, taskName: string, snapshotName: string) {
    const finishedTask = new FinishedTask();
    finishedTask.name = taskName;
    finishedTask.metadata = {
      pool_name: this.poolName,
      image_name: this.rbdName,
      snapshot_name: snapshotName
    };
    this.rbdService[task](this.poolName, this.rbdName, snapshotName)
      .toPromise()
      .then(() => {
        const executingTask = new ExecutingTask();
        executingTask.name = finishedTask.name;
        executingTask.metadata = finishedTask.metadata;
        this.summaryService.addRunningTask(executingTask);
        this.modalRef.hide();
        this.ngOnChanges();
        this.taskManagerService.subscribe(
          executingTask.name,
          executingTask.metadata,
          (asyncFinishedTask: FinishedTask) => {
            this.notificationService.notifyTask(asyncFinishedTask);
          }
        );
      })
      .catch((resp) => {
        this.modalRef.content.stopLoadingSpinner();
      });
  }

  rollbackModal() {
    const snapshotName = this.selection.selected[0].name;
    const initialState = {
      titleText: 'RBD snapshot rollback',
      buttonText: 'Rollback',
      bodyTpl: this.rollbackTpl,
      bodyData: {
        snapName: `${this.poolName}/${this.rbdName}@${snapshotName}`
      },
      onSubmit: () => {
        this._asyncTask('rollbackSnapshot', 'rbd/snap/rollback', snapshotName);
      }
    };

    this.modalRef = this.modalService.show(ConfirmationModalComponent, { initialState });
  }

  deleteSnapshotModal() {
    const snapshotName = this.selection.selected[0].name;
    this.modalRef = this.modalService.show(DeletionModalComponent);
    this.modalRef.content.setUp({
      metaType: 'RBD snapshot',
      deletionMethod: () => this._asyncTask('deleteSnapshot', 'rbd/snap/delete', snapshotName),
      modalRef: this.modalRef
    });
  }

  updateSelection(selection: CdTableSelection) {
    this.selection = selection;
  }
}
