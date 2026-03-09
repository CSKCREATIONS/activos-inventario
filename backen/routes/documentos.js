const router  = require('express').Router();
const ctrl    = require('../controllers/documentosController');
const upload  = require('../middlewares/upload');

router.get('/',       ctrl.getAll);
router.get('/:id',    ctrl.getById);
router.post('/',      upload.single('archivo'), ctrl.create);
router.put('/:id',    upload.single('archivo'), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
