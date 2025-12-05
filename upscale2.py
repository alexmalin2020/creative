"""
Универсальный скрипт для апскейла изображений
Поддерживает: Waifu2x, Real-ESRGAN x2, Real-ESRGAN x4
"""

import cv2
import numpy as np
from PIL import Image
import os
from pathlib import Path
import argparse
import urllib.request

# Проверка доступности библиотек
TORCH_AVAILABLE = False
REALESRGAN_AVAILABLE = False
WAIFU2X_AVAILABLE = False

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    print("⚠ PyTorch не установлен (нужен для RealESRGAN)")

try:
    from realesrgan import RealESRGANer
    from basicsr.archs.rrdbnet_arch import RRDBNet
    REALESRGAN_AVAILABLE = True
except ImportError:
    print("⚠ RealESRGAN не установлен")

try:
    from waifu2x_ncnn_py import Waifu2x
    WAIFU2X_AVAILABLE = True
except ImportError:
    print("⚠ Waifu2x не установлен")


class ImageUpscaler:
    def __init__(self, method='waifu2x', device='cuda', model_dir='models'):
        """
        Инициализация апскейлера
        
        Args:
            method: метод апскейла ('waifu2x', 'realesrgan_x2', 'realesrgan_x4')
            device: 'cuda' для GPU или 'cpu' для процессора
            model_dir: директория для хранения моделей
        """
        self.method = method
        self.device = device
        self.model_dir = model_dir
        
        os.makedirs(model_dir, exist_ok=True)
        
        if method == 'waifu2x':
            self._init_waifu2x()
        elif method in ['realesrgan_x2', 'realesrgan_x4']:
            self._init_realesrgan()
        else:
            raise ValueError(f"Неизвестный метод: {method}")
    
    def _init_waifu2x(self):
        """Инициализация Waifu2x"""
        if not WAIFU2X_AVAILABLE:
            raise RuntimeError("Waifu2x не установлен. Установите: pip install waifu2x-ncnn-py")
        
        print("Инициализация Waifu2x...")
        
        # Определяем GPU ID
        gpuid = 0 if self.device == 'cuda' else -1
        
        self.upsampler = Waifu2x(
            gpuid=gpuid,
            tta_mode=False,  # True для лучшего качества (медленнее)
            num_threads=4,
            noise=2,  # 0-3, шумоподавление
            scale=2,  # Waifu2x работает с x2
            tilesize=0,  # 0 = auto
            model="models-cunet"  # models-cunet для лучшего качества
        )
        
        device_name = "GPU" if gpuid >= 0 else "CPU"
        print(f"✓ Waifu2x загружен ({device_name})")
        self.scale = 2
    
    def _init_realesrgan(self):
        """Инициализация RealESRGAN"""
        if not REALESRGAN_AVAILABLE:
            raise RuntimeError("RealESRGAN не установлен. Установите: pip install realesrgan basicsr torch")
        
        if not TORCH_AVAILABLE:
            raise RuntimeError("PyTorch не установлен. Установите: pip install torch")
        
        # Проверка доступности CUDA
        if self.device == 'cuda' and not torch.cuda.is_available():
            print("⚠ CUDA недоступна, используется CPU")
            self.device = 'cpu'
        
        print(f"Используется устройство: {self.device}")
        
        # Параметры модели
        if self.method == 'realesrgan_x4':
            model_name = 'RealESRGAN_x4plus'
            model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, 
                          num_block=23, num_grow_ch=32, scale=4)
            netscale = 4
            model_url = 'https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth'
            model_filename = 'RealESRGAN_x4plus.pth'
        else:  # realesrgan_x2
            model_name = 'RealESRGAN_x2plus'
            model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, 
                          num_block=23, num_grow_ch=32, scale=2)
            netscale = 2
            model_url = 'https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.1/RealESRGAN_x2plus.pth'
            model_filename = 'RealESRGAN_x2plus.pth'
        
        model_path = os.path.join(self.model_dir, model_filename)
        
        # Скачиваем модель, если её нет
        if not os.path.exists(model_path):
            print(f"Скачивание модели {model_name}...")
            urllib.request.urlretrieve(model_url, model_path)
            print(f"Модель сохранена в {model_path}")
        
        # Создание апскейлера
        self.upsampler = RealESRGANer(
            scale=netscale,
            model_path=model_path,
            model=model,
            tile=0,
            tile_pad=10,
            pre_pad=0,
            half=True if self.device == 'cuda' else False,
            device=self.device
        )
        
        print(f"✓ {model_name} загружен успешно")
        self.scale = netscale
    
    def upscale_image(self, input_path, output_path=None, jpeg_quality=95):
        """
        Апскейл одного изображения
        
        Args:
            input_path: путь к входному изображению
            output_path: путь для сохранения (если None, создается автоматически)
            jpeg_quality: качество JPEG (0-100)
        """
        # Проверка существования файла
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Файл {input_path} не найден")
        
        print(f"\nОбработка: {input_path}")
        
        if self.method == 'waifu2x':
            # Waifu2x работает с PIL
            img_pil = Image.open(input_path)
            
            # Конвертируем в RGB если нужно
            if img_pil.mode != 'RGB':
                img_pil = img_pil.convert('RGB')
            
            w, h = img_pil.size
            print(f"Исходный размер: {w}x{h}")
            
            # Применяем Waifu2x
            output_pil = self.upsampler.process_pil(img_pil)
            
            new_w, new_h = output_pil.size
            print(f"Новый размер: {new_w}x{new_h}")
            
            # Создание выходного пути
            if output_path is None:
                input_file = Path(input_path)
                output_path = input_file.parent / f"{input_file.stem}_upscaled_{self.method}.jpg"
            else:
                output_path = Path(output_path).with_suffix('.jpg')
            
            # Сохранение
            output_pil.save(str(output_path), quality=jpeg_quality, optimize=True)
            
        else:  # RealESRGAN
            # RealESRGAN работает с OpenCV
            img = cv2.imread(input_path, cv2.IMREAD_COLOR)
            if img is None:
                raise ValueError(f"Не удалось загрузить изображение {input_path}")
            
            print(f"Исходный размер: {img.shape[1]}x{img.shape[0]}")
            
            # Апскейл
            output, _ = self.upsampler.enhance(img, outscale=self.scale)
            
            print(f"Новый размер: {output.shape[1]}x{output.shape[0]}")
            
            # Создание выходного пути
            if output_path is None:
                input_file = Path(input_path)
                output_path = input_file.parent / f"{input_file.stem}_upscaled_{self.method}.jpg"
            else:
                output_path = Path(output_path).with_suffix('.jpg')
            
            # Сохранение
            cv2.imwrite(str(output_path), output, [cv2.IMWRITE_JPEG_QUALITY, jpeg_quality])
        
        print(f"✓ Сохранено: {output_path}")
        
        return output_path
    
    def upscale_batch(self, input_folder, output_folder=None, 
                     extensions=['.jpg', '.jpeg', '.png', '.bmp', '.webp'], jpeg_quality=95):
        """
        Пакетный апскейл всех изображений в папке
        
        Args:
            input_folder: папка с исходными изображениями
            output_folder: папка для сохранения (если None, создается 'output')
            extensions: список расширений для обработки
            jpeg_quality: качество JPEG (0-100)
        """
        input_path = Path(input_folder)
        
        if not input_path.exists():
            raise FileNotFoundError(f"Папка {input_folder} не найдена")
        
        # Создание выходной папки
        if output_folder is None:
            output_path = input_path / f'output_{self.method}'
        else:
            output_path = Path(output_folder)
        
        output_path.mkdir(exist_ok=True)
        
        # Поиск всех изображений
        images = []
        for ext in extensions:
            images.extend(input_path.glob(f'*{ext}'))
            images.extend(input_path.glob(f'*{ext.upper()}'))
        
        if not images:
            print(f"Не найдено изображений с расширениями {extensions}")
            return
        
        print(f"\n{'='*60}")
        print(f"Найдено {len(images)} изображений для обработки")
        print(f"Метод: {self.method} (x{self.scale})")
        print(f"{'='*60}")
        
        # Обработка каждого изображения
        success_count = 0
        for i, img_path in enumerate(images, 1):
            print(f"\n[{i}/{len(images)}]")
            try:
                output_file = output_path / f"{img_path.stem}_upscaled.jpg"
                self.upscale_image(str(img_path), str(output_file), jpeg_quality)
                success_count += 1
            except Exception as e:
                print(f"✗ Ошибка при обработке {img_path}: {e}")
        
        print(f"\n{'='*60}")
        print(f"Обработка завершена: {success_count}/{len(images)} успешно")
        print(f"Результаты сохранены в {output_path}")
        print(f"{'='*60}")


def main():
    """Основная функция с обработкой аргументов командной строки"""
    
    # Проверка доступности методов
    available_methods = []
    if WAIFU2X_AVAILABLE:
        available_methods.append('waifu2x')
    if REALESRGAN_AVAILABLE:
        available_methods.extend(['realesrgan_x2', 'realesrgan_x4'])
    
    if not available_methods:
        print("\n❌ ОШИБКА: Не установлен ни один метод апскейла!")
        print("\nУстановите один из методов:")
        print("  1. Waifu2x: pip install waifu2x-ncnn-py")
        print("  2. RealESRGAN: pip install realesrgan basicsr torch")
        return
    
    parser = argparse.ArgumentParser(
        description='Универсальный апскейл изображений (Waifu2x, RealESRGAN x2/x4)',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Примеры использования:

  # Waifu2x (x2, лучше для обложек альбомов)
  python upscale.py -i image.jpg -m waifu2x
  
  # RealESRGAN x2 (консервативное увеличение)
  python upscale.py -i image.jpg -m realesrgan_x2
  
  # RealESRGAN x4 (максимальное увеличение)
  python upscale.py -i image.jpg -m realesrgan_x4
  
  # Пакетная обработка папки
  python upscale.py -i ./images -m waifu2x --batch
  
  # С CPU вместо GPU
  python upscale.py -i image.jpg -m waifu2x -d cpu
        """
    )
    
    parser.add_argument('--input', '-i', type=str, required=True, 
                       help='Путь к входному изображению или папке')
    parser.add_argument('--output', '-o', type=str, 
                       help='Путь для сохранения результата (опционально)')
    parser.add_argument('--method', '-m', type=str, default='waifu2x',
                       choices=available_methods,
                       help=f'Метод апскейла (доступны: {", ".join(available_methods)})')
    parser.add_argument('--device', '-d', type=str, default='cuda',
                       choices=['cuda', 'cpu'],
                       help='Устройство для обработки (по умолчанию: cuda)')
    parser.add_argument('--quality', '-q', type=int, default=95,
                       choices=range(0, 101),
                       metavar='[0-100]',
                       help='Качество JPEG (по умолчанию: 95)')
    parser.add_argument('--batch', '-b', action='store_true',
                       help='Пакетная обработка всех изображений в папке')
    
    args = parser.parse_args()
    
    # Вывод информации о методах
    print("\n" + "="*60)
    print("Универсальный Image Upscaler")
    print("="*60)
    print("\n📊 Доступные методы:")
    if 'waifu2x' in available_methods:
        print("  ✓ Waifu2x (x2) - AI, отлично для арт-работ и обложек")
    else:
        print("  ✗ Waifu2x - не установлен")
    
    if 'realesrgan_x2' in available_methods:
        print("  ✓ RealESRGAN x2 - AI, консервативное увеличение")
    else:
        print("  ✗ RealESRGAN x2 - не установлен")
    
    if 'realesrgan_x4' in available_methods:
        print("  ✓ RealESRGAN x4 - AI, максимальное увеличение")
    else:
        print("  ✗ RealESRGAN x4 - не установлен")
    
    print("\n" + "="*60)
    print(f"Выбранный метод: {args.method}")
    print("="*60 + "\n")
    
    # Инициализация апскейлера
    try:
        upscaler = ImageUpscaler(method=args.method, device=args.device)
    except Exception as e:
        print(f"\n❌ Ошибка инициализации: {e}")
        return
    
    # Обработка в зависимости от режима
    try:
        if args.batch:
            upscaler.upscale_batch(args.input, args.output, jpeg_quality=args.quality)
        else:
            upscaler.upscale_image(args.input, args.output, jpeg_quality=args.quality)
    except Exception as e:
        print(f"\n❌ Ошибка обработки: {e}")


if __name__ == '__main__':
    main()