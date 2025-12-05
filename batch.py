"""
Оптимизированный скрипт для скачивания и апскейла изображений из CSV
"""

import asyncio
import csv
import os
import random
import gc
from pathlib import Path
from urllib.parse import urlparse
import cv2
import torch
from playwright.async_api import async_playwright
from PIL import Image

# Требуется установка: 
# pip install playwright opencv-python pillow torch basicsr realesrgan
# playwright install chromium


class ImageProcessor:
    def __init__(self, csv_file='data.csv', base_folder='images', model_name='RealESRGAN_x4plus'):
        self.csv_file = csv_file
        self.base_folder = base_folder
        self.model_name = model_name
        self.upscaler = None
        self.browser = None
        self.context = None
        
        # Создаём базовую папку
        os.makedirs(base_folder, exist_ok=True)
    
    def parse_csv(self):
        """Парсинг CSV файла"""
        rows = []
        with open(self.csv_file, 'r', encoding='utf-8') as f:
            for line in f:
                parts = line.strip().split(';')
                
                if len(parts) >= 8:
                    row = {
                        'product_url': parts[1],
                        'image_urls': parts[-1]
                    }
                    rows.append(row)
        return rows
    
    def extract_folder_name(self, url):
        """Извлечение названия папки из URL"""
        parts = url.rstrip('/').split('/')
        return parts[-1]
    
    async def init_browser(self):
        """Инициализация браузера (один раз)"""
        if self.browser is None:
            p = await async_playwright().start()
            self.playwright = p
            
            self.browser = await p.chromium.launch(
                headless=True,
                args=[
                    '--disable-blink-features=AutomationControlled',
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage'
                ]
            )
            
            self.context = await self.browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            )
            
            await self.context.set_extra_http_headers({
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.creativefabrica.com/',
            })
    
    async def close_browser(self):
        """Закрытие браузера"""
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        if hasattr(self, 'playwright'):
            await self.playwright.stop()
    
    async def download_image(self, url, output_path):
        """Скачивание одного изображения"""
        await self.init_browser()
        
        page = await self.context.new_page()
        
        try:
            response = await page.goto(url, wait_until='networkidle', timeout=30000)
            
            if response.status == 200:
                body = await response.body()
                
                is_png = url.lower().endswith('.png')
                
                if is_png:
                    from io import BytesIO
                    img = Image.open(BytesIO(body))
                    if img.mode in ('RGBA', 'LA', 'P'):
                        background = Image.new('RGB', img.size, (255, 255, 255))
                        if img.mode == 'P':
                            img = img.convert('RGBA')
                        background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                        img = background
                    img.save(output_path, 'JPEG', quality=85)
                else:
                    with open(output_path, 'wb') as f:
                        f.write(body)
                
                return True
            else:
                print(f"  ❌ HTTP {response.status}: {url}")
                return False
                
        except Exception as e:
            print(f"  ❌ Ошибка при скачивании: {e}")
            return False
        finally:
            await page.close()
    
    async def download_images_for_product(self, image_urls, target_folder):
        """Скачивание случайного количества изображений (2-4) для продукта"""
        available = len(image_urls)
        
        if available == 0:
            print("  ⚠️ Список изображений пуст")
            return []
        elif available == 1:
            num_to_download = 1
            selected_urls = image_urls
        else:
            max_download = min(4, available)
            num_to_download = random.randint(2, max_download)
            selected_urls = random.sample(image_urls, num_to_download)
        
        print(f"  Скачиваем {num_to_download} из {available} изображений")
        
        downloaded_files = []
        
        for url in selected_urls:
            filename = os.path.basename(urlparse(url).path)
            filename = filename.replace('-580x387', '').replace('-580x392', '').replace('-580x363', '')
            filename = os.path.splitext(filename)[0] + '.jpg'
            
            output_path = os.path.join(target_folder, filename)
            
            print(f"  Скачиваем: {filename}")
            success = await self.download_image(url, output_path)
            
            if success:
                downloaded_files.append(output_path)
                print(f"  ✅ Сохранено: {filename}")
        
        return downloaded_files
    
    def initialize_upscaler(self):
        """Инициализация апскейлера"""
        if self.upscaler is not None:
            return
        
        from realesrgan import RealESRGANer
        from basicsr.archs.rrdbnet_arch import RRDBNet
        import urllib.request
        
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        print(f"\nИнициализация апскейлера (устройство: {device})...")
        
        model_dir = 'models'
        os.makedirs(model_dir, exist_ok=True)
        
        model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, 
                       num_block=23, num_grow_ch=32, scale=4)
        model_path = os.path.join(model_dir, 'RealESRGAN_x4plus.pth')
        
        if not os.path.exists(model_path):
            print("Скачивание модели RealESRGAN_x4plus...")
            model_url = 'https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth'
            urllib.request.urlretrieve(model_url, model_path)
            print(f"Модель сохранена в {model_path}")
        
        # Используем tile для экономии памяти
        self.upscaler = RealESRGANer(
            scale=4,
            model_path=model_path,
            model=model,
            tile=256,  # Разбивка на тайлы для экономии памяти
            tile_pad=10,
            pre_pad=0,
            half=True if device == 'cuda' else False,
            device=device
        )
        
        print("✅ Апскейлер инициализирован\n")
    
    def upscale_images(self, folder_path):
        """Апскейл всех изображений в папке с перезаписью"""
        self.initialize_upscaler()
        
        image_files = list(Path(folder_path).glob('*.jpg'))
        image_files.extend(Path(folder_path).glob('*.jpeg'))
        
        if not image_files:
            print("  ⚠️ Нет изображений для апскейла")
            return
        
        print(f"  Апскейл {len(image_files)} изображений...")
        
        for img_path in image_files:
            try:
                img = cv2.imread(str(img_path), cv2.IMREAD_COLOR)
                if img is None:
                    print(f"  ❌ Не удалось загрузить {img_path.name}")
                    continue
                
                print(f"    {img_path.name}: {img.shape[1]}x{img.shape[0]} → ", end='', flush=True)
                
                # Апскейл
                output, _ = self.upscaler.enhance(img, outscale=4)
                
                print(f"{output.shape[1]}x{output.shape[0]}")
                
                # Перезаписываем файл
                cv2.imwrite(str(img_path), output, [cv2.IMWRITE_JPEG_QUALITY, 95])
                
                # Очищаем память
                del img
                del output
                gc.collect()
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
                
            except Exception as e:
                print(f"  ❌ Ошибка при апскейле {img_path.name}: {e}")
        
        print(f"  ✅ Апскейл завершён\n")
    
    async def process_all(self):
        """Обработка всех строк из CSV"""
        rows = self.parse_csv()
        print(f"Найдено {len(rows)} продуктов для обработки\n")
        
        try:
            for i, row in enumerate(rows, 1):
                print(f"[{i}/{len(rows)}] Обработка продукта...")
                
                product_url = row['product_url'].strip()
                image_urls_str = row['image_urls'].strip()
                
                folder_name = self.extract_folder_name(product_url)
                target_folder = os.path.join(self.base_folder, folder_name)
                os.makedirs(target_folder, exist_ok=True)
                
                print(f"  Папка: {folder_name}")
                
                image_urls = [url.strip() for url in image_urls_str.split(',') 
                             if url.strip() and url.strip().startswith('http')]
                
                if not image_urls:
                    print(f"  ⚠️ Нет изображений для скачивания\n")
                    continue
                
                # Скачиваем изображения
                downloaded = await self.download_images_for_product(image_urls, target_folder)
                
                if downloaded:
                    # Апскейлим скачанные изображения
                    self.upscale_images(target_folder)
                else:
                    print(f"  ⚠️ Не удалось скачать изображения\n")
        
        finally:
            # Закрываем браузер в конце
            await self.close_browser()
        
        print("=" * 60)
        print("✅ Обработка завершена!")


async def main():
    processor = ImageProcessor(
        csv_file='data.csv',
        base_folder='images',
        model_name='RealESRGAN_x4plus'
    )
    await processor.process_all()


if __name__ == '__main__':
    asyncio.run(main())